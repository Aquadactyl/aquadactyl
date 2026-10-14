@extends('layouts.admin')

@section('title')
  {{ __('admin/ui.extensions') }}
@endsection

@php
  $is_installed = $PlaceholderService->installed() != 'NOTINSTALLED' && $PlaceholderService->version() != '::'.'v';
  $extensions = $is_installed ? $blueprint->extensionsConfigs() : collect();
@endphp

@section('content-header')
  <h1>{{ __('admin/ui.extensions') }}<small>{{ __('admin/ui.extensions_description') }}</small></h1>
  <ol class="breadcrumb">
    <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
    <li class="active">{{ __('admin/ui.extensions') }}</li>
  </ol>
@endsection

@section('content')
  @if($is_installed)
    @if($PlaceholderService->version() != $latestBlueprintVersion && !in_array($PlaceholderService->version(), ['rolling', 'unknown']) && $latestBlueprintVersion != 'unknown')
      <div class="blueprint-statusbar blueprint-statusbar-danger" role="status">
        <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>{{ __('admin/ui.blueprint_is_out_of_date') }}</strong>
          {{ __('admin/ui.you_re_running_blueprint') }} <code>{{ $PlaceholderService->version() }}</code>
          {{ __('admin/ui.which_is_outdated_update_to_version') }} <code>{{ $latestBlueprintVersion }}</code>
          {{ __('admin/ui.to_access_the_latest_features_and_improvements') }}
        </div>
      </div>
    @endif

    @if($PlaceholderService->version() == 'rolling')
      <div class="blueprint-statusbar blueprint-statusbar-warning" role="status">
        <i class="fa fa-bug" aria-hidden="true"></i>
        <div>
          <strong>{{ __('admin/ui.this_instance_is_running_a_development_preview_of_blueprint') }}</strong>
          {{ __('admin/ui.you_may_run_into_bugs_extension_incompatibilities_and_more_if_you_run_into_any_issues') }}
          <a href="https://github.com/blueprintframework/framework/issues" target="_blank" rel="noopener noreferrer">{{ __('admin/ui.let_us_know') }}</a>.
        </div>
      </div>
    @endif

    @if($latestBlueprintVersion == 'unknown' && $PlaceholderService->version() != 'rolling')
      <div class="blueprint-statusbar blueprint-statusbar-warning" role="status">
        <i class="fa fa-exclamation-circle" aria-hidden="true"></i>
        <div>
          <strong>{{ __('admin/ui.could_not_fetch_version_info') }}</strong>
          {{ __('admin/ui.blueprint_failed_to_fetch_the_latest_release_name_from_the_api') }}
        </div>
      </div>
    @endif

    <section class="blueprint-page-header" aria-labelledby="blueprintBannerTitle">
      <div class="blueprint-banner-content">
        <h2 id="blueprintBannerTitle">{{ __('admin/ui.blueprint') }}</h2>
        <p>{{ __('admin/ui.aquadactyl_s_favorite_modding_community_develop_collaborate_and_install_extensions_wi') }}</p>
      </div>
      <a class="blueprint-banner-link" href="https://blueprint.zip/" target="_blank" rel="noopener noreferrer">
        {{ __('admin/ui.learn_more') }} <i class="fa fa-external-link" aria-hidden="true"></i>
      </a>
    </section>

    <div class="box box-primary admin-extensions">
      <div class="box-header with-border">
        <h3 class="box-title">
          {{ __('admin/ui.installed_extensions') }}
          <span class="extension-count">{{ $extensions->count() }}</span>
        </h3>
        <div class="box-tools">
          <a class="btn btn-default btn-sm extensions-browse" href="https://blueprint.zip/browse" target="_blank" rel="noopener noreferrer">
            <i class="fa fa-plus" aria-hidden="true"></i> {{ __('admin/ui.browse_extensions') }}
          </a>
        </div>
      </div>
      <div class="box-body">
        <div class="extensions-grid">
          <button type="button" class="btn extension-btn extension-card" data-toggle="modal" data-target="#blueprintConfigModal" aria-label="{{ __('admin/ui.configure') }} {{ __('admin/ui.blueprint') }}">
            <img src="/assets/extensions/blueprint/logo.jpg" alt="" class="extension-card-icon"/>
            <span class="extension-card-details">
              <span class="extension-card-name">{{ __('admin/ui.blueprint') }}</span>
              <span class="extension-card-meta">
                <span class="extension-card-tag">{{ __('admin/ui.extension_framework') }}</span>
                <span>{{ $PlaceholderService->version() }}</span>
              </span>
            </span>
            <i class="fa fa-cog extension-card-action" aria-hidden="true"></i>
          </button>

          @foreach($extensions as $extension)
            @php
              $info = $extension['info'];
            @endphp
            @include('blueprint.admin.entry', [
              'EXTENSION_ID' => $info['identifier'],
              'EXTENSION_NAME' => $info['name'],
              'EXTENSION_VERSION' => $info['version'],
              'EXTENSION_METADATA' => $metadata[$info['identifier']] ?? null,
              'EXTENSION_ICON' => !empty($info['icon'])
                ? '/assets/extensions/'.$info['identifier'].'/icon.'.pathinfo($info['icon'], PATHINFO_EXTENSION)
                : '/assets/extensions/'.$info['identifier'].'/icon.jpg',
            ])
          @endforeach
        </div>
      </div>
      <div class="box-footer extensions-footer">
        <span><i class="fa fa-puzzle-piece" aria-hidden="true"></i> Blueprint Framework <code>{{ $PlaceholderService->version() }}</code></span>
        <a href="https://blueprint.zip/" target="_blank" rel="noopener noreferrer">{{ __('admin/ui.learn_more') }} <i class="fa fa-external-link" aria-hidden="true"></i></a>
      </div>
    </div>

    <!-- Blueprint configuration -->
    <div class="modal fade" id="blueprintConfigModal" tabindex="-1" role="dialog" aria-labelledby="blueprintConfigTitle">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <form action="/admin/extensions/blueprint" method="POST" autocomplete="off">
            <div class="modal-header">
              <button type="button" class="close" data-dismiss="modal" aria-label="{{ __('admin/ui.close') }}"><span aria-hidden="true">&times;</span></button>
              <h3 class="modal-title" id="blueprintConfigTitle">
                <img src="/assets/extensions/blueprint/logo.jpg" alt="" height="34" width="34"/>
                <span>{{ __('admin/ui.configure') }} <b>{{ __('admin/ui.blueprint') }}</b></span>
              </h3>
            </div>

            <div class="modal-body">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th style="width:50%">{{ __('admin/ui.flag') }}</th>
                    <th>{{ __('admin/ui.value') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @foreach($configuration as $key => $value)
                    @if(strpos($key, 'flags:') === 0)
                      @php
                        $flagKey = str_replace('flags:', '', $key);
                        $schema = $seeder->getSchema();
                        $flagConfig = $schema['flags'][$flagKey] ?? null;
                        $flagType = $flagConfig['type'] ?? 'string';
                        $flagHidden = $flagConfig['hidden'] ?? false;
                      @endphp
                      @if($flagHidden != true)
                        <tr data-flag-row data-flag-name="{{ $key }}" data-flag-type="{{ $flagType }}" data-default-value="{{ $defaults[$key] }}">
                          <td>
                            <code>
                              {{ $flagKey }}
                            </code>
                          </td>
                          <td>
                            @switch($flagType)
                              @case('boolean')
                                <select class="form-control" name="{{ $key }}" style="border-radius:6px">
                                  <option value="1" {{ $value ? 'selected' : '' }}>true</option>
                                  <option value="0" {{ !$value ? 'selected' : '' }}>false</option>
                                </select>
                                @break
                              @case('number')
                                <input type="number" class="form-control" name="{{ $key }}" value="{{ $value }}" step="any" style="border-radius:6px">
                                @break
                              @case('integer')
                                <input type="number" class="form-control" name="{{ $key }}" value="{{ $value }}" step="1" style="border-radius:6px">
                                @break

                              @default
                                <input type="text" class="form-control" name="{{ $key }}" value="{{ $value }}" style="border-radius:6px">
                            @endswitch
                          </td>
                        </tr>
                      @endif
                    @endif
                  @endforeach
                </tbody>
              </table>
            </div>

            <div class="modal-footer">
              {{ csrf_field() }}
              <input type="hidden" name="_method" value="PATCH">
              <p class="text-muted small text-left">{{ __('admin/ui.flags_enable_certain_features_that_may_be_experimental_unstable_or_in_development_mod') }}</p>
              <button type="submit" class="btn btn-primary">{{ __('admin/ui.save') }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  @else
    <div class="box extensions-installation-notice">
      <i class="fa fa-info-circle" aria-hidden="true"></i>
      <h3>{{ __('admin/ui.unfinished_installation') }}</h3>
      <p>{{ __('admin/ui.blueprint_is_currently_only_partially_installed') }}</p>
      <p>
        {{ __('admin/ui.finish_the') }}
        <a href="https://blueprint.zip/guides/admin/install" target="_blank" rel="noopener noreferrer">{{ __('admin/ui.installation_guide') }}</a>{{ __('admin/ui.then_return_to_this_page_afterwards') }}
      </p>
      <p>{{ __('admin/ui.you_may_be_able_to_fix_this_issue_by_running') }} <code>blueprint -upgrade</code>.</p>
    </div>
  @endif
@endsection

@section('footer-scripts')
  @parent
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const flagRows = document.querySelectorAll('[data-flag-row]');

      const createResetButton = (row, input) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'blueprint-button-link reset-flag';
        button.title = @json(__('admin/ui.reset_to_default'));
        button.setAttribute('aria-label', button.title);
        button.style.padding = '0';
        button.style.marginLeft = '8px';
        button.innerHTML = '<i class="fa fa-undo" aria-hidden="true"></i>';

        const defaultValue = getDefaultValue(row);

        button.addEventListener('click', (e) => {
          e.preventDefault();
          input.value = defaultValue;
          input.dispatchEvent(new Event('change'));
        });

        return button;
      };

      const getDefaultValue = (row) => {
        const flagType = row.dataset.flagType;
        const defaultValue = row.dataset.defaultValue;

        if (flagType === 'boolean' && (!defaultValue || defaultValue === '')) {
          return '0';
        }

        return defaultValue;
      };

      const compareValues = (input, defaultValue) => {
        const flagType = input.closest('[data-flag-row]').dataset.flagType;
        const currentValue = input.value;

        const effectiveDefault = flagType === 'boolean' && (!defaultValue || defaultValue === '')
          ? '0'
          : defaultValue;

        switch (flagType) {
          case 'boolean':
            return currentValue !== effectiveDefault;
          case 'number':
          case 'integer':
            return Number(currentValue) !== Number(effectiveDefault);
          default:
            return String(currentValue) !== String(effectiveDefault);
        }
      };

      const handleValueChange = (row, input) => {
        const defaultValue = getDefaultValue(row);

        const existingButton = row.querySelector('td .reset-flag');
        if (existingButton) {
          existingButton.remove();
        }

        if (compareValues(input, defaultValue)) {
          const resetButton = createResetButton(row, input);
          row.querySelector('td').appendChild(resetButton);
        }
      };

      flagRows.forEach(row => {
        const input = row.querySelector('select, input');
        if (!input) return; // Skip if no input found

        handleValueChange(row, input);

        input.addEventListener('change', () => {
          handleValueChange(row, input);
        });

        if (input.tagName.toLowerCase() === 'input') {
          input.addEventListener('keyup', () => {
            handleValueChange(row, input);
          });
        }
      });
    });
  </script>
@endsection
