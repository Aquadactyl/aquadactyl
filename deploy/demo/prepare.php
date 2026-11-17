<?php

require __DIR__ . '/bootstrap.php';

// Restore the last baseline before applying migrations, so an image update can
// generate a clean new snapshot with the current schema instead of stale data.
if (is_file('/app/var/demo-baseline.sql')) {
    $process = demoDatabaseProcess(false);
    $process->setInput(fopen('/app/var/demo-baseline.sql', 'r'));
    $process->mustRun();
}
