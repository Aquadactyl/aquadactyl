<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Pterodactyl\Models\ServerSubdomain;
use Pterodactyl\Models\SubdomainDomain;
use Pterodactyl\Jobs\SyncServerSubdomain;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;

class SubdomainsController extends Controller
{
    public function index(): View
    {
        return view('admin.subdomains', [
            'domains' => SubdomainDomain::orderBy('domain')->get(),
            'entries' => ServerSubdomain::with(['domain', 'server'])->latest()->paginate(20),
        ]);
    }

    public function store(Request $request, ConfirmAccountPassword $confirmation): RedirectResponse
    {
        $confirmation->handle($request);
        $data = $request->validate([
            'domain' => ['required', 'string', 'max:189', 'unique:subdomain_domains,domain', 'regex:/\A(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\z/'],
            'zone_id' => ['required', 'regex:/\A[a-f0-9]{32}\z/'],
            'api_token' => ['required', 'string', 'max:512', 'regex:/\A[A-Za-z0-9_-]+\z/'],
            'target_ip' => 'nullable|ip',
        ]);
        if (!empty($data['target_ip'])) {
            abort_unless(filter_var($data['target_ip'], FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE), 422, __('admin/operations.public_ip_required'));
        }
        SubdomainDomain::create($data);

        return redirect('/admin/subdomains');
    }

    public function update(Request $request, SubdomainDomain $domain, ConfirmAccountPassword $confirmation): RedirectResponse
    {
        $data = $request->validate(['enabled' => 'required|boolean', 'api_token' => ['sometimes', 'nullable', 'string', 'max:512', 'regex:/\A[A-Za-z0-9_-]+\z/']]);
        if (!empty($data['api_token'])) {
            $confirmation->handle($request);
        } else {
            unset($data['api_token']);
        }
        $domain->update($data);

        return redirect('/admin/subdomains');
    }

    public function destroy(SubdomainDomain $domain): RedirectResponse
    {
        abort_if(ServerSubdomain::where('domain_id', $domain->id)->exists(), 409, __('admin/operations.domain_in_use'));
        $domain->delete();

        return redirect('/admin/subdomains');
    }

    public function remove(ServerSubdomain $entry): RedirectResponse
    {
        $entry->update(['status' => 'deleting']);
        SyncServerSubdomain::dispatch($entry->id)->afterCommit();

        return redirect('/admin/subdomains');
    }
}
