import { describe, expect, it } from 'vitest';
import { createDemoSeedContext } from '../../server/db/seeds/context';
import { createSeededTestServices } from '../helpers/demo-db';

const context = createDemoSeedContext();
const occ = { userId: 'USR-001', role: 'OCC' };
const maintenance = { userId: 'USR-MAINTENANCE-MANAGER', role: 'Maintenance Manager' };
const certifier = { userId: 'USR-CERTIFYING-STAFF', role: 'Certifying Staff' };

describe('AircraftAirworthinessService', () => {
  it('evaluates M8 aircraft-level technical eligibility from canonical MRO state', async () => {
    const { services, sqlite } = await createSeededTestServices();

    expect(
      services.aircraftAirworthiness.evaluateAircraftTechnicalEligibility('ac-pk-dma')
    ).toMatchObject({
      status: 'ELIGIBLE',
      eligible: true,
      blockers: []
    });

    const restricted =
      services.aircraftAirworthiness.evaluateAircraftTechnicalEligibility('ac-pk-dme');
    expect(restricted).toMatchObject({
      status: 'ELIGIBLE_WITH_RESTRICTIONS',
      eligible: true,
      restrictions: [
        expect.objectContaining({
          sourceType: 'DEFERRED_DEFECT',
          restriction: expect.stringContaining('Maximum payload')
        })
      ]
    });

    expect(
      services.aircraftAirworthiness.evaluateAircraftTechnicalEligibility('ac-pk-dmd')
    ).toMatchObject({
      status: 'BLOCKED',
      eligible: false,
      blockers: expect.arrayContaining([
        expect.objectContaining({ code: 'AIRCRAFT_UNSERVICEABLE' }),
        expect.objectContaining({ code: 'MANDATORY_MAINTENANCE_OVERDUE' })
      ])
    });

    const expired = services.aircraftAirworthiness.evaluateAircraftTechnicalEligibility(
      'ac-pk-dme',
      {
        at: '2026-08-19T09:00:00.000+09:00'
      }
    );
    expect(expired).toMatchObject({
      status: 'BLOCKED',
      blockers: expect.arrayContaining([expect.objectContaining({ code: 'DEFERMENT_EXPIRED' })])
    });

    sqlite.close();
  });

  it('exposes seeded release evidence and derives maintenance due independently of status', async () => {
    const { services, sqlite } = await createSeededTestServices();

    expect(services.aircraftAirworthiness.detail('ac-pk-dma')).toMatchObject({
      aircraft: {
        serviceabilityStatus: 'SERVICEABLE',
        technicalEligibility: 'ELIGIBLE',
        maintenanceDue: false
      },
      releases: [expect.objectContaining({ releaseNumber: 'RTS-BASE-PRT-001' })]
    });
    expect(services.aircraftAirworthiness.detail('ac-pk-dmd').aircraft).toMatchObject({
      serviceabilityStatus: 'UNSERVICEABLE',
      technicalEligibility: 'BLOCKED',
      maintenanceDue: true
    });

    sqlite.close();
  });

  it('records defect report as pending assessment and invalidates assigned flight readiness', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const before = services.aircraftAirworthiness.detail('ac-pk-dma').aircraft;

    const result = services.aircraftAirworthiness.reportDefect(
      'ac-pk-dma',
      {
        title: 'Propeller vibration',
        description: 'Abnormal propeller vibration reported during the post-flight inspection.',
        detectedAt: context.at(0, '08:00'),
        sourceReference: 'TECHLOG-PRT-009',
        evidenceReferences: ['TECHLOG-PRT-009'],
        expectedVersion: before.version
      },
      occ
    );

    expect(result.aircraft).toMatchObject({
      serviceabilityStatus: 'SERVICEABLE',
      technicalEligibility: 'BLOCKED',
      openDefectCount: 1,
      version: before.version + 1
    });
    const affectedFlightId = result.affectedFlightIds[0];
    expect(affectedFlightId).toBeTruthy();
    const readiness = services.flightOperations
      .detail(affectedFlightId!)
      .readinessChecks.find((check) => check.checkCode === 'AIRCRAFT_SERVICEABILITY');
    expect(readiness).toMatchObject({ status: 'FAIL', effectiveStatus: 'BLOCKED' });

    sqlite.close();
  });

  it('requires maintenance deferment followed by a separate certifying-staff release', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const initial = services.aircraftAirworthiness.detail('ac-pk-dmf').aircraft;
    const grounded = services.aircraftAirworthiness.reportDefect(
      'ac-pk-dmf',
      {
        title: 'Position light inoperative',
        description:
          'Left position light is inoperative and requires MEL assessment before flight.',
        detectedAt: context.at(0, '07:00'),
        sourceReference: 'TECHLOG-DMF-011',
        evidenceReferences: ['TECHLOG-DMF-011'],
        expectedVersion: initial.version
      },
      occ
    );
    const defectId = grounded.defects[0]!.id;

    const assessment = services.maintenance.assessDefect(
      defectId,
      {
        assessmentDecision: 'DEFER',
        assessmentNote:
          'Maintenance Control defers the position light defect with day operating limitation.',
        deferment: {
          defermentType: 'MEL',
          referenceCode: 'MEL 33-40-01',
          category: 'C',
          operationalLimitations: 'Day VFR operations only until the position light is rectified.',
          maintenanceProcedure: 'Placard and isolate the affected position light circuit.',
          operationsProcedure: 'Dispatch only during the approved day operating period.',
          effectiveAt: context.at(0, '08:00'),
          expiresAt: context.at(10, '08:00'),
          targetRectificationAt: context.at(8, '08:00'),
          authorizationReference: 'MEL-AUTH-DMF-011',
          applicableRouteIds: [],
          applicableServiceTypeCodes: ['POSITIONING']
        }
      },
      maintenance
    );
    const deferred = services.aircraftAirworthiness.detail('ac-pk-dmf');

    expect(assessment.assessmentDecision).toBe('DEFER');
    expect(deferred.aircraft.serviceabilityStatus).toBe('SERVICEABLE');
    expect(deferred.aircraft.technicalEligibility).toBe('RESTRICTED');
    expect(deferred.defects[0]?.status).toBe('DEFERRED');

    const released = services.aircraftAirworthiness.issueRelease(
      'ac-pk-dmf',
      {
        releaseNumber: 'RTS-DMF-011',
        resultingStatus: 'SERVICEABLE_WITH_RESTRICTIONS',
        workOrderReference: 'WO-DMF-011',
        releaseStatement:
          'Aircraft is approved for return to service subject to MEL 33-40-01 day VFR limitations.',
        certifyingLicenseNumber: 'AME-CERT-011',
        releasedAt: context.at(0, '08:30'),
        defectIds: [defectId],
        evidenceReferences: ['WO-DMF-011', 'MEL-AUTH-DMF-011'],
        expectedVersion: deferred.aircraft.version
      },
      certifier
    );

    expect(released.aircraft).toMatchObject({
      serviceabilityStatus: 'SERVICEABLE_WITH_RESTRICTIONS',
      technicalEligibility: 'RESTRICTED',
      activeRestrictionCount: 1
    });
    expect(released.releases[0]).toMatchObject({
      releaseNumber: 'RTS-DMF-011',
      certifyingUserId: certifier.userId
    });

    sqlite.close();
  });

  it('propagates restricted serviceability to Flight without claiming operational compatibility', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const base = {
      flightDate: context.date(1),
      flightTypeId: 'flight-type-charter',
      priorityId: 'flight-priority-normal',
      routeId: 'route-wmx-oks',
      customerId: 'cust-papua-logistics',
      aircraftId: 'ac-pk-dme',
      pilotInCommandId: 'crew-pic-valid',
      coPilotId: 'crew-cop-valid',
      scheduledDepartureAt: context.at(1, '10:00'),
      scheduledArrivalAt: context.at(1, '11:10'),
      remarks: 'Restricted serviceability evaluation'
    };
    const permitted = services.flightOperations.create(
      {
        ...base,
        serviceTypeId: 'flight-service-type-charter-cargo'
      },
      occ.userId
    );
    const prohibited = services.flightOperations.create(
      {
        ...base,
        scheduledDepartureAt: context.at(1, '12:00'),
        scheduledArrivalAt: context.at(1, '13:10'),
        serviceTypeId: 'flight-service-type-charter-passenger'
      },
      occ.userId
    );

    expect(
      permitted.readinessChecks.find((item) => item.checkCode === 'AIRCRAFT_SERVICEABILITY')
    ).toMatchObject({ status: 'PASS' });
    expect(
      prohibited.readinessChecks.find((item) => item.checkCode === 'AIRCRAFT_SERVICEABILITY')
    ).toMatchObject({
      status: 'PASS',
      resultNote: expect.stringContaining('maintenance restriction')
    });

    sqlite.close();
  });

  it('rejects stale transitions and retirement with non-terminal flight assignments', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const aircraft = services.aircraftAirworthiness.detail('ac-pk-dma').aircraft;

    expect(() =>
      services.aircraftAirworthiness.transitionOperational(
        'ac-pk-dma',
        {
          toStatus: 'SUSPENDED',
          reason: 'Aircraft held from fleet planning for an operational review.',
          expectedVersion: aircraft.version + 1
        },
        occ
      )
    ).toThrowError(expect.objectContaining({ code: 'STALE_VERSION' }));

    expect(() =>
      services.aircraftAirworthiness.transitionOperational(
        'ac-pk-dma',
        {
          toStatus: 'RETIRED',
          reason: 'Permanent withdrawal from the active operating fleet.',
          expectedVersion: aircraft.version
        },
        occ
      )
    ).toThrowError(expect.objectContaining({ code: 'AIRCRAFT_RETIREMENT_BLOCKED' }));

    sqlite.close();
  });

  it('derives a blocker from calendar, hours, or cycles maintenance limits', async () => {
    const { services, sqlite } = await createSeededTestServices();
    const aircraft = services.aircraftAirworthiness.detail('ac-pk-dmf').aircraft;

    const result = services.aircraftAirworthiness.addMaintenanceRequirement(
      'ac-pk-dmf',
      {
        requirementCode: 'PHASE_1_INSPECTION',
        title: 'Phase 1 scheduled inspection',
        dueAt: context.date(0),
        dueAirframeHours: null,
        dueAirframeCycles: null,
        sourceReference: 'AMP-05-20-01',
        expectedVersion: aircraft.version
      },
      maintenance
    );

    expect(result.aircraft).toMatchObject({
      maintenanceDue: true,
      technicalEligibility: 'BLOCKED'
    });
    expect(result.aircraft.dueReasons[0]).toContain('PHASE_1_INSPECTION');

    sqlite.close();
  });

  it('expires MEL/CDL records during the sweep and grounds the aircraft', async () => {
    const { services, sqlite } = await createSeededTestServices();
    sqlite
      .prepare(
        `UPDATE aircraft_deferments SET expires_at = ?
         WHERE id = 'adefer-pk-dme-001'`
      )
      .run(context.at(-1, '08:00'));

    const result = services.aircraftAirworthiness.sweep();

    expect(result.expiredAircraftIds).toContain('ac-pk-dme');
    expect(services.aircraftAirworthiness.detail('ac-pk-dme').aircraft).toMatchObject({
      serviceabilityStatus: 'UNSERVICEABLE',
      technicalEligibility: 'BLOCKED'
    });

    sqlite.close();
  });
});
