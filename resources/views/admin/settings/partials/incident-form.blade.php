@php($fieldId = 'incident-' . ($incident?->id ?? 'new'))
<div class="row">
    <div class="form-group col-sm-8"><label for="{{ $fieldId }}-title">{{ __('integrations.title') }}</label><input id="{{ $fieldId }}-title" name="title" class="form-control" value="{{ $incident?->title }}" maxlength="160" required></div>
    <div class="form-group col-sm-4"><label for="{{ $fieldId }}-status">{{ __('integrations.status.state') }}</label><select id="{{ $fieldId }}-status" name="status" class="form-control">@foreach(\Pterodactyl\Models\StatusIncident::STATES as $state)<option value="{{ $state }}" @selected(($incident?->status ?? 'investigating') === $state)>{{ __('integrations.status.' . $state) }}</option>@endforeach</select></div>
</div>
<div class="form-group"><label for="{{ $fieldId }}-message">{{ __('integrations.message') }}</label><textarea id="{{ $fieldId }}-message" name="message" class="form-control" rows="3" maxlength="5000" required>{{ $incident?->message }}</textarea></div>
