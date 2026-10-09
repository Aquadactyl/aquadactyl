<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Pterodactyl\Models\Egg;
use Illuminate\Http\Request;
use Pterodactyl\Models\Nest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Pagination\LengthAwarePaginator;
use Pterodactyl\Services\Eggs\EggDownloadService;
use Pterodactyl\Services\Nests\NestCreationService;
use Pterodactyl\Exceptions\Model\DataValidationException;
use Pterodactyl\Services\Eggs\Sharing\EggImporterService;
use Pterodactyl\Exceptions\Service\InvalidFileUploadException;
use Pterodactyl\Http\Requests\Admin\Egg\EggDownloadImportRequest;

class EggLibraryController extends Controller
{
    public function __construct(
        private EggDownloadService $downloads,
        private EggImporterService $importer,
        private NestCreationService $nestCreator,
        private AlertsMessageBag $alerts,
    ) {
    }

    public function index(Request $request): View
    {
        $filters = $request->validate([
            'q' => 'nullable|string|max:120',
            'source' => 'nullable|in:pterodactyl,pelican,community,all',
            'category' => 'nullable|string|max:191',
            'page' => 'nullable|integer|min:1|max:1000',
        ]);
        $query = trim($filters['q'] ?? '');
        $source = $filters['source'] ?? 'pterodactyl';
        $category = $filters['category'] ?? '';
        $error = null;
        try {
            $catalog = collect($this->downloads->catalog());
        } catch (DisplayException $exception) {
            $catalog = collect();
            $error = $exception->getMessage();
        }
        $available = $catalog->filter(fn ($egg) => $source === 'all' || $egg['source'] === $source);
        $categories = $available->pluck('category')->filter()->unique()->sort()->values();
        $terms = preg_split('/\s+/u', mb_strtolower($query), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $filtered = $available->filter(fn ($egg) => (!$category || $egg['category'] === $category)
            && collect($terms)->every(fn ($term) => str_contains(mb_strtolower(implode(' ', [$egg['name'], $egg['category'], $egg['repo']])), $term)))
            ->sortBy(fn ($egg) => mb_strtolower($egg['name']))->values();
        $page = (int) ($filters['page'] ?? 1);
        $eggs = new LengthAwarePaginator($filtered->forPage($page, 24)->values(), $filtered->count(), 24, $page, [
            'path' => route('admin.egg-library.index'),
            'query' => $request->except('page'),
        ]);

        return view('admin.egg-library.index', compact('eggs', 'query', 'source', 'category', 'categories', 'error'));
    }

    public function show(string $slug): View|RedirectResponse
    {
        try {
            $document = $this->downloads->detail($slug);
        } catch (DisplayException $exception) {
            $this->alerts->danger($exception->getMessage())->flash();

            return redirect()->route('admin.egg-library.index');
        }

        return view('admin.egg-library.show', [
            'slug' => $slug,
            'egg' => $document['egg'],
            'metadata' => $document['meta'],
            'readme' => $document['readme'],
            'compatible' => $this->downloads->compatible($document['egg']),
            'eggHash' => hash('sha256', $this->downloads->encode($document['egg'])),
            'nests' => Nest::query()->orderBy('name')->get(),
            'existingEggs' => Egg::query()->where('name', $document['egg']['name'])
                ->where('author', $document['egg']['author'])->pluck('id', 'nest_id'),
        ]);
    }

    public function download(string $slug): Response
    {
        return response($this->downloads->encode($this->downloads->detail($slug)['egg']), 200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="egg-' . $slug . '.json"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function import(EggDownloadImportRequest $request, string $slug): RedirectResponse
    {
        $document = $this->downloads->detail($slug);
        if (!$this->downloads->compatible($document['egg'])) {
            throw ValidationException::withMessages(['egg' => 'This egg uses an unsupported format. Choose a PTDL_v1 or PTDL_v2 egg.']);
        }
        $json = $this->downloads->encode($document['egg']);
        if (!hash_equals(hash('sha256', $json), $request->string('egg_hash')->toString())) {
            throw ValidationException::withMessages(['egg' => 'This egg changed since you opened the preview. Review the current version and import again.']);
        }
        $file = tmpfile();
        if ($file === false) {
            throw new DisplayException('Could not prepare the egg file. Please try again.');
        }

        try {
            if (fwrite($file, $json) !== strlen($json)) {
                throw new DisplayException('Could not write the egg file. Please try again.');
            }
            $upload = new UploadedFile(stream_get_meta_data($file)['uri'], 'egg-' . $slug . '.json', 'application/json', null, true);
            $egg = DB::transaction(function () use ($request, $document, $upload) {
                if ($request->input('nest_id') === 'new') {
                    $name = trim($request->string('new_nest_name')->toString());
                    if ($name === '') {
                        throw ValidationException::withMessages(['new_nest_name' => 'Give the new nest a name.']);
                    }
                    $nest = Nest::query()->where('name', $name)->first()
                        ?? $this->nestCreator->handle(['name' => $name, 'description' => 'Eggs imported from eggs.download.']);
                } else {
                    $nest = Nest::query()->findOrFail($request->integer('nest_id'));
                }
                // Serialize imports into the same nest so repeated submissions reuse the existing egg.
                Nest::query()->whereKey($nest->id)->lockForUpdate()->firstOrFail();
                $existing = Egg::query()->where('nest_id', $nest->id)->where('name', $document['egg']['name'])
                    ->where('author', $document['egg']['author'] ?? '')->first();

                return $existing ?? $this->importer->handle($upload, $nest->id);
            });
        } catch (DataValidationException $exception) {
            throw ValidationException::withMessages(['egg' => 'The downloaded egg has invalid settings: ' . implode(' ', $exception->getMessageBag()->all())]);
        } catch (InvalidFileUploadException|\JsonException $exception) {
            throw new DisplayException('The downloaded egg file could not be imported. Choose another egg or try again later.', $exception);
        } finally {
            fclose($file);
        }

        $this->alerts->success('The egg is available in ' . $egg->nest->name . '.')->flash();

        return redirect()->route('admin.nests.egg.view', ['egg' => $egg->id]);
    }
}
