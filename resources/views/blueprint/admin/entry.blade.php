@if(isset($EXTENSION_ID))
  @php
    $latest = true;
    if(isset($EXTENSION_METADATA)) {
      $diff = str_replace($EXTENSION_METADATA['latest_version'], '', $EXTENSION_VERSION);

      if(
        $EXTENSION_METADATA['latest_version'] != $EXTENSION_VERSION
        && $EXTENSION_METADATA['local_version'] == $EXTENSION_VERSION
        && $diff != "v"
      ) {
        $latest = false;
      }
    }
  @endphp

    <a class="extension-btn extension-card" href="{{ route('admin.extensions.'.$EXTENSION_ID.'.index') }}">
      <img src="{{ $EXTENSION_ICON }}" alt="" class="extension-card-icon" loading="lazy"/>
      <span class="extension-card-details">
        <span class="extension-card-name">{{ $EXTENSION_NAME }}</span>
        <span class="extension-card-meta">
          <span>{{ $EXTENSION_VERSION }}</span>
          @if(!$latest)
          <span class="extension-btn-update">
            <i class="fa fa-arrow-up" aria-hidden="true"></i>
            <span>{{ $EXTENSION_METADATA['latest_version'] }}</span>
          </span>
          @endif
        </span>
      </span>
      <i class="fa fa-angle-right extension-card-action" aria-hidden="true"></i>
    </a>
@endif
