<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\ServerTransfer;
use Illuminate\Support\Facades\Validator;
use Pterodactyl\Exceptions\DisplayException;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use Pterodactyl\Exceptions\PterodactylException;
use Pterodactyl\Exceptions\AutoDeploymentException;
use Pterodactyl\Exceptions\ManifestDoesNotExistException;
use Pterodactyl\Exceptions\Model\DataValidationException;
use Pterodactyl\Exceptions\Solutions\ManifestDoesNotExistSolution;
use Pterodactyl\Exceptions\Http\Server\ServerStateConflictException;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;
use Pterodactyl\Exceptions\Transformer\InvalidTransformerLevelException;

test('data validation exception returns validator and model instances', function () {
    $validator = Validator::make([], ['field' => 'required']);
    $model = (new Server())->forceFill(['id' => 1]);
    $e = new DataValidationException($validator, $model);

    expect($e->getValidator())->toBe($validator)
        ->and($e->getModel())->toBe($model)
        ->and($e->getMessageBag())->toBe($validator->errors())
        ->and($e->getStatusCode())->toBe(500)
        ->and($e->getHeaders())->toBe([])
        ->and($e->getMessage())->toContain('Could not save');
});

test('server state conflict exception handles all server states', function () {
    // 1. Suspended
    $serverSuspended = (new Server())->forceFill(['status' => Server::STATUS_SUSPENDED]);
    $e1 = new ServerStateConflictException($serverSuspended);
    expect($e1->getMessage())->toContain('suspended');

    // 2. Node under maintenance
    $nodeMaintenance = (new Node())->forceFill(['maintenance_mode' => true]);
    $serverNodeMaintenance = (new Server())->forceFill(['status' => null]);
    $serverNodeMaintenance->setRelation('node', $nodeMaintenance);
    $e2 = new ServerStateConflictException($serverNodeMaintenance);
    expect($e2->getMessage())->toContain('under maintenance');

    // 3. Not installed
    $nodeOk = (new Node())->forceFill(['maintenance_mode' => false]);
    $serverNotInstalled = (new Server())->forceFill(['status' => Server::STATUS_INSTALLING]);
    $serverNotInstalled->setRelation('node', $nodeOk);
    $e3 = new ServerStateConflictException($serverNotInstalled);
    expect($e3->getMessage())->toContain('not yet completed its installation');

    // 4. Restoring backup
    $serverRestoring = (new Server())->forceFill(['status' => Server::STATUS_RESTORING_BACKUP]);
    $serverRestoring->setRelation('node', $nodeOk);
    $e4 = new ServerStateConflictException($serverRestoring);
    expect($e4->getMessage())->toContain('restoring from a backup');

    // 5. Transferring
    $serverTransferring = (new Server())->forceFill(['status' => null]);
    $serverTransferring->setRelation('node', $nodeOk);
    $serverTransferring->setRelation('transfer', new ServerTransfer());
    $e5 = new ServerStateConflictException($serverTransferring);
    expect($e5->getMessage())->toContain('being transferred');

    // 6. Generic unsupported state
    $serverGeneric = (new Server())->forceFill(['status' => 'unknown_state']);
    $serverGeneric->setRelation('node', $nodeOk);
    $serverGeneric->setRelation('transfer', null);
    $e6 = new ServerStateConflictException($serverGeneric);
    expect($e6->getMessage())->toContain('unsupported state, please try again later');
});

test('daemon connection exception handles null response, panic 200, client 4xx, and server 5xx', function () {
    // 1. Null response
    $transferException = new class('Network timeout') extends Exception implements GuzzleHttp\Exception\GuzzleException {};
    $eNull = new DaemonConnectionException($transferException);
    expect($eNull->getStatusCode())->toBe(504)
        ->and($eNull->getErrorLevel())->toBe(DisplayException::LEVEL_WARNING)
        ->and($eNull->getMessage())->toContain('Could not establish a connection')
        ->and($eNull->getRequestId())->toBeNull();

    // 2. Response with 200 (wings panic before stream ended) -> converts to 502
    $panicResponse = new GuzzleResponse(200, ['X-Request-Id' => 'req-panic-123'], 'premature eof');
    $guzzlePanic = new class($panicResponse) extends Exception implements GuzzleHttp\Exception\GuzzleException {
        public function __construct(private $response)
        {
        }

        public function getResponse()
        {
            return $this->response;
        }
    };

    $ePanic = new DaemonConnectionException($guzzlePanic);
    expect($ePanic->getStatusCode())->toBe(502)
        ->and($ePanic->getErrorLevel())->toBe(DisplayException::LEVEL_ERROR)
        ->and($ePanic->getRequestId())->toBe('req-panic-123');

    // 3. Response with 404 and JSON body
    $response404 = new GuzzleResponse(404, ['X-Request-Id' => 'req-404'], json_encode(['error' => 'Resource not found']));
    $guzzle404 = new class($response404) extends Exception implements GuzzleHttp\Exception\GuzzleException {
        public function __construct(private $response)
        {
        }

        public function getResponse()
        {
            return $this->response;
        }
    };

    $e404 = new DaemonConnectionException($guzzle404);
    expect($e404->getStatusCode())->toBe(404)
        ->and($e404->getErrorLevel())->toBe(DisplayException::LEVEL_WARNING)
        ->and($e404->getMessage())->toContain('Resource not found');

    // 4. Response with 500 error
    $response500 = new GuzzleResponse(500, ['X-Request-Id' => 'req-500'], 'Internal error');
    $guzzle500 = new class($response500) extends Exception implements GuzzleHttp\Exception\GuzzleException {
        public function __construct(private $response)
        {
        }

        public function getResponse()
        {
            return $this->response;
        }
    };

    $e500 = new DaemonConnectionException($guzzle500);
    expect($e500->getStatusCode())->toBe(500)
        ->and($e500->getErrorLevel())->toBe(DisplayException::LEVEL_ERROR)
        ->and($e500->getMessage())->toContain('(code: 500)');

    // Test report logs with request_id
    Log::shouldReceive('error')->with($guzzle500, ['request_id' => 'req-500'])->once();
    $e500->report();
});

test('manifest does not exist exception provides ignition solution', function () {
    $e = new ManifestDoesNotExistException('Manifest missing');
    $solution = $e->getSolution();

    expect($solution)->toBeInstanceOf(ManifestDoesNotExistSolution::class)
        ->and($solution->getSolutionTitle())->toContain('manifest.json')
        ->and($solution->getSolutionDescription())->toContain('pnpm run build')
        ->and($solution->getDocumentationLinks())->toHaveKey('Docs');
});

test('instantiation of various custom pterodactyl exceptions', function () {
    $autoDeploy = new AutoDeploymentException('Auto deploy failed');
    expect($autoDeploy)->toBeInstanceOf(Exception::class);

    $transformerLevel = new InvalidTransformerLevelException('Invalid level');
    expect($transformerLevel)->toBeInstanceOf(PterodactylException::class);

    $accountNotFound = new Pterodactyl\Exceptions\AccountNotFoundException('Not found');
    expect($accountNotFound)->toBeInstanceOf(Exception::class);

    $recordNotFound = new Pterodactyl\Exceptions\Repository\RecordNotFoundException('Record not found');
    expect($recordNotFound)->toBeInstanceOf(PterodactylException::class)
        ->and($recordNotFound->getStatusCode())->toBe(404)
        ->and($recordNotFound->getHeaders())->toBe([]);

    $repoEx = new Pterodactyl\Exceptions\Repository\RepositoryException('Repo error');
    expect($repoEx)->toBeInstanceOf(PterodactylException::class);

    $duplicateDb = new Pterodactyl\Exceptions\Repository\DuplicateDatabaseNameException('Duplicate DB');
    expect($duplicateDb)->toBeInstanceOf(PterodactylException::class);

    $powerSignal = new Pterodactyl\Exceptions\Repository\Daemon\InvalidPowerSignalException('Invalid signal');
    expect($powerSignal)->toBeInstanceOf(PterodactylException::class);

    // HTTP Exceptions
    $forbidden = new Pterodactyl\Exceptions\Http\HttpForbiddenException('Access denied');
    expect($forbidden->getStatusCode())->toBe(403);

    $fileSize = new Pterodactyl\Exceptions\Http\Server\FileSizeTooLargeException();
    expect($fileSize->getMessage())->toContain('too large');

    $twoFactor = new Pterodactyl\Exceptions\Http\TwoFactorAuthRequiredException();
    expect($twoFactor->getStatusCode())->toBe(400);

    // Service Exceptions
    $serviceLimit = new Pterodactyl\Exceptions\Service\ServiceLimitExceededException('Limit reached');
    expect($serviceLimit->getErrorLevel())->toBe(DisplayException::LEVEL_WARNING);

    $invalidTotp = new Pterodactyl\Exceptions\Service\User\TwoFactorAuthenticationTokenInvalid();
    expect($invalidTotp->getMessage())->toContain('token was not valid');

    $activeServers = new Pterodactyl\Exceptions\Service\HasActiveServersException('Has servers');
    expect($activeServers->getStatusCode())->toBe(400);

    $activeNodes = new Pterodactyl\Exceptions\Service\Location\HasActiveNodesException('Has nodes');
    expect($activeNodes->getStatusCode())->toBe(400);

    // Allocation Exceptions
    $autoAllocNotEnabled = new Pterodactyl\Exceptions\Service\Allocation\AutoAllocationNotEnabledException();
    expect($autoAllocNotEnabled->getMessage())->toContain('not enabled');

    $cidrOutOfRange = new Pterodactyl\Exceptions\Service\Allocation\CidrOutOfRangeException();
    expect($cidrOutOfRange)->toBeInstanceOf(DisplayException::class);

    $invalidPort = new Pterodactyl\Exceptions\Service\Allocation\InvalidPortMappingException('abc');
    expect($invalidPort)->toBeInstanceOf(DisplayException::class);

    $noSpace = new Pterodactyl\Exceptions\Service\Allocation\NoAutoAllocationSpaceAvailableException();
    expect($noSpace->getMessage())->toContain('no more space');

    $portOutOfRange = new Pterodactyl\Exceptions\Service\Allocation\PortOutOfRangeException();
    expect($portOutOfRange)->toBeInstanceOf(DisplayException::class);

    $tooManyPorts = new Pterodactyl\Exceptions\Service\Allocation\TooManyPortsInRangeException();
    expect($tooManyPorts)->toBeInstanceOf(DisplayException::class);

    // Backup Exceptions
    $backupLocked = new Pterodactyl\Exceptions\Service\Backup\BackupLockedException();
    expect($backupLocked->getMessage())->toContain('marked as locked');

    $tooManyBackups = new Pterodactyl\Exceptions\Service\Backup\TooManyBackupsException(5);
    expect($tooManyBackups->getMessage())->toContain('limit of 5 backups');

    // Database Exceptions
    $dbFeatureDisabled = new Pterodactyl\Exceptions\Service\Database\DatabaseClientFeatureNotEnabledException();
    expect($dbFeatureDisabled->getMessage())->toContain('not enabled');

    $noDbHost = new Pterodactyl\Exceptions\Service\Database\NoSuitableDatabaseHostException();
    expect($noDbHost->getMessage())->toContain('No database host was found');

    $tooManyDatabases = new Pterodactyl\Exceptions\Service\Database\TooManyDatabasesException();
    expect($tooManyDatabases->getMessage())->toContain('Operation aborted');
});
