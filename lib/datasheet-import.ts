import seed from "./datasheet-seed.json";

const fields: [string, string][] = [
  ["incidentNumber","incident_number"],["incidentCode","incident_code"],["beneficiaryName","beneficiary_name"],["gender","gender"],["contact","contact"],["age","age"],
  ["urgency","urgency"],["category","category"],["caseType","case_type"],["pickupType","pickup_type"],["pickupLocation","pickup_location"],
  ["pickupGovernorate","pickup_governorate"],["pickupMunicipality","pickup_municipality"],["pickupNeighborhood","pickup_neighborhood"],
  ["dropoffType","dropoff_type"],["dropoffLocation","dropoff_location"],["shift","shift"],["station","station"],["vehicle","vehicle"],
  ["kmStart","km_start"],["kmEnd","km_end"],["distanceKm","distance_km"],["callDate","call_date"],["callTime","call_time"],
  ["dispatchDate","dispatch_date"],["dispatchTime","dispatch_time"],["onSceneDate","on_scene_date"],["arrivalTime","arrival_time"],
  ["hospitalDate","hospital_date"],["hospitalTime","hospital_time"],["availableDate","available_date"],["clearTime","clear_time"],
  ["dispatcherPrimary","dispatcher_primary"],["dispatcherSecondary","dispatcher_secondary"],["emtDriver","emt_driver"],["emtLead","emt_lead"],["emtAssist","emt_assist"],
  ["fuelLiters","fuel_liters"],["cancelled","cancelled"],["notes","notes"],["patientDeceased","patient_deceased"],["conflictRelated","conflict_related"],
  ["chiefComplaint","chief_complaint"],["oxygen","oxygen"],["bvm","bvm"],["airway","airway"],["cpr","cpr"],["aed","aed"],["drugs","drugs"],
  ["woundCare","wound_care"],["tourniquet","tourniquet"],["immobilization","immobilization"],["cervicalCollar","cervical_collar"],
  ["glucoseCheck","glucose_check"],["splinting","splinting"],["delivery","delivery"],["sourceImportKey","source_import_key"],
  ["sourceIncidentNumber","source_incident_number"],["sourceIncidentCode","source_incident_code"],["importBatch","import_batch"],
  ["dataQualityStatus","data_quality_status"],["dataQualityNotes","data_quality_notes"],["approvalStatus","approval_status"],
];

export async function ensureDataSheetImported(db: any) {
  const existing = await db.prepare("SELECT COUNT(*) count FROM incidents WHERE import_batch = ?")
    .bind("Data Sheet Sep 2026").first();
  if ((existing?.count || 0) >= seed.length) return { imported: 0, total: seed.length };
  const sql = `INSERT OR IGNORE INTO incidents (${fields.map(([,c])=>c).join(",")},created_by) VALUES (${fields.map(()=>"?").join(",")},?)`;
  let imported = 0;
  for (let i=0; i<seed.length; i+=40) {
    const statements = seed.slice(i,i+40).map((record:any) =>
      db.prepare(sql).bind(
        ...fields.map(([key]) => {
          const value = record[key];
          return typeof value === "boolean" ? (value ? 1 : 0) : value ?? null;
        }),
        "excel-import",
      ),
    );
    try {
      const result = await db.batch(statements);
      imported += result.filter((x:any)=>x.meta?.changes).length;
    } catch {
      // A single legacy row must never prevent the dashboard from loading.
      for (const statement of statements) {
        try {
          const result = await statement.run();
          if (result.meta?.changes) imported++;
        } catch {
          // Keep the valid historical rows and skip only the incompatible row.
        }
      }
    }
  }
  return { imported, total: seed.length };
}
