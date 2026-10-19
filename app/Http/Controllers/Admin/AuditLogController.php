<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Pterodactyl\Models\ActivityLog;
use Pterodactyl\Http\Controllers\Controller;

class AuditLogController extends Controller
{
    public function index(Request $request): View
    {
        $filters = $request->validate([
            'actor' => 'nullable|string|max:191', 'event' => 'nullable|string|max:191',
            'kind' => 'nullable|in:admin,user,system', 'ip' => 'nullable|ip',
            'from' => 'nullable|date_format:Y-m-d', 'to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('from') ? ['after_or_equal:from'] : [])],
            'page' => 'sometimes|integer|min:1',
        ]);
        $query = ActivityLog::query()->with(['actor', 'subjects.subject']);
        if (!empty($filters['actor'])) {
            $query->whereHasMorph('actor', [User::class], function ($users) use ($filters) {
                $term = '%' . $filters['actor'] . '%';
                $users->where(fn ($q) => $q->where('username', 'like', $term)->orWhere('email', 'like', $term));
            });
        }
        if (!empty($filters['event'])) {
            $query->where(fn ($q) => $q->where('event', 'like', '%' . $filters['event'] . '%')->orWhere('properties->route', 'like', '%' . $filters['event'] . '%'));
        }
        if (($filters['kind'] ?? null) === 'admin') {
            $query->where('event', 'like', 'admin:%');
        } elseif (($filters['kind'] ?? null) === 'user') {
            $query->whereNotNull('actor_id')->where('event', 'not like', 'admin:%');
        } elseif (($filters['kind'] ?? null) === 'system') {
            $query->whereNull('actor_id')->where('event', 'not like', 'admin:%');
        }
        foreach (['ip', 'from', 'to'] as $key) {
            if (empty($filters[$key])) {
                continue;
            }
            if ($key === 'ip') {
                $query->where('ip', $filters[$key]);
            } else {
                $query->where('timestamp', $key === 'from' ? '>=' : '<=', $filters[$key] . ($key === 'from' ? ' 00:00:00' : ' 23:59:59'));
            }
        }

        return view('admin.audit-logs', [
            'entries' => $query->orderByDesc('timestamp')->orderByDesc('id')->paginate(50)->withQueryString(),
            'filters' => $filters,
        ]);
    }
}
