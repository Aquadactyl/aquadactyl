@if($area === 'login')<h4>{{ __('admin/custom.login_background') }}</h4>@endif
<form action="{{ route('admin.settings.background', $area, false) }}" method="POST" enctype="multipart/form-data" data-image-action="{{ $area }}" class="appearance-image-form background-upload-form">
    @csrf
    <fieldset @disabled($disabled)>
        <div class="form-group"><label for="{{ $area }}-background-file">{{ __('admin/custom.background_image') }}</label><input id="{{ $area }}-background-file" type="file" name="background" accept="image/png,image/jpeg,image/webp" required class="form-control" data-preview-area="{{ $area }}"></div>
        <p class="text-muted">{{ __('admin/custom.background_upload_help') }}</p>
        <button type="submit" class="btn btn-primary btn-sm">{{ __('admin/custom.upload_background') }}</button>
    </fieldset>
</form>
<form action="{{ route('admin.settings.background', $area, false) }}" method="POST" data-image-action="{{ $area }}" data-image-remove="{{ $area }}" class="appearance-image-form background-remove-form" @if(!$appearance[$area . 'Background']['url']) hidden @endif>
    @csrf
    @method('DELETE')
    <button type="submit" class="btn btn-default btn-sm" @disabled($disabled)>{{ __('admin/custom.remove_background') }}</button>
</form>
<p class="appearance-image-status" data-image-status="{{ $area }}" role="status" aria-live="polite"></p>
<fieldset @disabled($disabled)>
    @foreach(['blur' => [0, 30, 'px'], 'overlay' => [0, 95, '%']] as $effect => [$min, $max, $unit])
        @php($value = old($area . '_' . $effect, $appearance[$area . 'Background'][$effect]))
        <div class="form-group appearance-effect-control">
            <label for="{{ $area }}-{{ $effect }}">{{ __('admin/custom.' . $effect) }} <output for="{{ $area }}-{{ $effect }}" id="{{ $area }}-{{ $effect }}-value">{{ $value }}{{ $unit }}</output></label>
            <input type="range" form="appearance-settings" class="appearance-range" id="{{ $area }}-{{ $effect }}" name="{{ $area }}_{{ $effect }}" min="{{ $min }}" max="{{ $max }}" step="1" value="{{ $value }}" data-unit="{{ $unit }}">
        </div>
    @endforeach
    <p class="text-muted">{{ __('admin/custom.background_effects_help') }}</p>
</fieldset>
