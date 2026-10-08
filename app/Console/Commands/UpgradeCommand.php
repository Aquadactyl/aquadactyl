<?php

namespace Pterodactyl\Console\Commands;

use Illuminate\Console\Command;

class UpgradeCommand extends Command
{
    protected $signature = 'p:upgrade
        {--user= : Legacy option; use WEB_USER with panel-update.sh.}
        {--group= : Legacy option; use WEB_GROUP with panel-update.sh.}
        {--url= : Legacy option; use panel-update.sh --archive instead.}
        {--release= : Legacy option; pass a release tag to panel-update.sh.}
        {--skip-download : Legacy option; use panel-update.sh --archive instead.}';

    protected $description = 'Shows the managed Aquadactyl update instructions.';

    public function handle(): int
    {
        $this->error('Use the managed Aquadactyl updater to preserve the panel and bundled Blueprint.');
        $this->line('sudo bash scripts/panel-update.sh <release-tag> Aquadactyl/aquadactyl');
        $this->line('For a local archive: sudo bash scripts/panel-update.sh --archive /path/panel.tar.gz <sha256>');

        return self::FAILURE;
    }
}
