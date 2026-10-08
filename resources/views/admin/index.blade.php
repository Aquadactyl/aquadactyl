@extends('layouts.admin')

@section('title')
    Administration
@endsection

@section('content-header')
    <h1>Administrative Overview<small>A quick glance at your system.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Index</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-info">
            <div class="box-header with-border">
                <h3 class="box-title">System Information</h3>
            </div>
            <div class="box-body">
                You are running Aquadactyl Panel version <code>{{ config('app.version') }}</code>.
                Check <a href="https://github.com/Aquadactyl/aquadactyl/releases" target="_blank" rel="noopener noreferrer">Aquadactyl releases</a>
                for updates and follow the <a href="https://aquadactyl.uk/docs/updating">update guide</a>.
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://discord.euphoriadevelopment.uk" class="btn btn-warning" style="width:100%;" target="_blank" rel="noopener noreferrer"><i class="fa fa-fw fa-comments" aria-hidden="true"></i> Get Help</a>
    </div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://aquadactyl.uk/docs" class="btn btn-primary" style="width:100%;" target="_blank" rel="noopener noreferrer"><i class="fa fa-fw fa-book" aria-hidden="true"></i> Documentation</a>
    </div>
    <div class="clearfix visible-xs-block">&nbsp;</div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://github.com/Aquadactyl/aquadactyl" class="btn btn-primary" style="width:100%;" target="_blank" rel="noopener noreferrer"><i class="fa fa-fw fa-github" aria-hidden="true"></i> GitHub</a>
    </div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://aquadactyl.uk" class="btn btn-success" style="width:100%;" target="_blank" rel="noopener noreferrer"><i class="fa fa-fw fa-globe" aria-hidden="true"></i> Website</a>
    </div>
</div>
@endsection
