-- Default platform commission (percent of trip fare). AppStateService also defaults when key is absent.
INSERT INTO "AppSetting" ("key", "booleanValue", "jsonValue", "createdAt", "updatedAt")
VALUES (
  'commissionSettings',
  NULL,
  '{"commissionType": "percent", "commissionRate": 5}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
