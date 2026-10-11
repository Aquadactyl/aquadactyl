@extends('layouts.admin')

@section('title')
    {{ __('admin/ui.new_nest') }}
@endsection

@section('content-header')
    <h1>{{ __('admin/ui.new_nest') }}<small>{{ __('admin/ui.configure_a_new_nest_to_deploy_to_all_nodes') }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">{{ __('admin/ui.admin') }}</a></li>
        <li><a href="{{ route('admin.nests') }}">{{ __('admin/ui.nests') }}</a></li>
        <li class="active">{{ __('admin/ui.new') }}</li>
    </ol>
@endsection

@section('content')
<form action="{{ route('admin.nests.new') }}" method="POST">
    <div class="row">
        <div class="col-md-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">{{ __('admin/ui.new_nest') }}</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">{{ __('admin/ui.name') }}</label>
                        <div>
                            <input type="text" name="name" class="form-control" value="{{ old('name') }}" />
                            <p class="text-muted"><small>{{ __('admin/ui.this_should_be_a_descriptive_category_name_that_encompasses_all_of_the_eggs_within_th') }}</small></p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="control-label">{{ __('admin/ui.description') }}</label>
                        <div>
                            <textarea name="description" class="form-control" rows="6">{{ old('description') }}</textarea>
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary pull-right">{{ __('admin/ui.save') }}</button>
                </div>
            </div>
        </div>
    </div>
</form>
@endsection
