-- Optional deep-link target on Notification, so the client can navigate
-- straight to the record a notification is about.
ALTER TABLE "Notification" ADD COLUMN "entity" TEXT;
ALTER TABLE "Notification" ADD COLUMN "entityId" TEXT;
