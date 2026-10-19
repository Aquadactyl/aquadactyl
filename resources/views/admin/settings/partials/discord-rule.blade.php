@php($ruleId = 'rule-' . ($rule?->id ?? 'new'))
<div class="row">
    <div class="form-group col-sm-6"><label for="{{ $ruleId }}-name">{{ __('integrations.name') }}</label><input id="{{ $ruleId }}-name" name="name" class="form-control" value="{{ $rule?->name }}" maxlength="100" required></div>
    <div class="form-group col-sm-6"><label for="{{ $ruleId }}-role">{{ __('integrations.discord.role_id') }}</label><input id="{{ $ruleId }}-role" name="role_id" class="form-control" value="{{ $rule?->role_id }}" inputmode="numeric" pattern="[1-9][0-9]{16,19}" maxlength="20" required></div>
</div>
<div class="row">
    <div class="form-group col-sm-6"><label for="{{ $ruleId }}-egg">{{ __('integrations.discord.egg') }}</label><select id="{{ $ruleId }}-egg" name="egg_id" class="form-control"><option value="">{{ __('integrations.discord.any_egg') }}</option>@if($rule?->egg_id && !$eggs->contains('id', $rule->egg_id))<option value="{{ $rule->egg_id }}" selected>{{ __('integrations.discord.deleted_filter') }}</option>@endif @foreach($eggs as $egg)<option value="{{ $egg->id }}" @selected($rule?->egg_id === $egg->id)>{{ $egg->name }}</option>@endforeach</select></div>
    <div class="form-group col-sm-6"><label for="{{ $ruleId }}-node">{{ __('integrations.node') }}</label><select id="{{ $ruleId }}-node" name="node_id" class="form-control"><option value="">{{ __('integrations.discord.any_node') }}</option>@if($rule?->node_id && !$nodes->contains('id', $rule->node_id))<option value="{{ $rule->node_id }}" selected>{{ __('integrations.discord.deleted_filter') }}</option>@endif @foreach($nodes as $node)<option value="{{ $node->id }}" @selected($rule?->node_id === $node->id)>{{ $node->name }}</option>@endforeach</select></div>
</div>
<div class="row">
    <div class="form-group col-sm-6"><label for="{{ $ruleId }}-count">{{ __('integrations.discord.minimum') }}</label><input id="{{ $ruleId }}-count" name="minimum_servers" type="number" class="form-control" min="1" max="10000" value="{{ $rule?->minimum_servers ?? 1 }}" required></div>
    <div class="form-group col-sm-6"><label for="{{ $ruleId }}-enabled">{{ __('integrations.enabled') }}</label><select id="{{ $ruleId }}-enabled" name="enabled" class="form-control"><option value="1" @selected($rule?->enabled ?? true)>{{ __('integrations.enabled') }}</option><option value="0" @selected($rule && !$rule->enabled)>{{ __('integrations.disabled') }}</option></select></div>
</div>
