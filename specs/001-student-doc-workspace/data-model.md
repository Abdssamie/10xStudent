# Data Model: Student Document Workspace

## Entities

### Student

_Identity managed by Clerk, synced to DB_

- `id` (String, PK): Clerk User ID
- `email` (String): Unique
- `name` (String): Display name
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### ApiKey

_User-provided keys for AI services_

- `id` (UUID, PK)
- `studentId` (String, FK -> Student.id)
- `provider` (Enum): 'OPENAI', 'GEMINI'
- `encryptedKey` (String): AES-256 encrypted
- `keyMask` (String): e.g., "sk-...X8j2" for display
- `createdAt` (DateTime)

### Document

_Base entity for all user work_

- `id` (UUID, PK)
- `studentId` (String, FK -> Student.id)
- `title` (String)
- `type` (Enum): 'RESUME', 'GENERAL'
- `content` (Text):
  - For RESUME: YAML string
  - For GENERAL: Typst source code
- `version` (Integer): For optimistic locking
- `isPublic` (Boolean): For sharing (optional future proofing)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Resource

_Uploaded assets (Images, Data files)_

- `id` (UUID, PK)
- `studentId` (String, FK -> Student.id)
- `documentId` (UUID, FK -> Document.id, Nullable): If attached to specific doc
- `filename` (String): Original name
- `storageKey` (String): R2 path (e.g., `users/{userId}/{uuid}.png`)
- `mimeType` (String)
- `sizeBytes` (Integer)
- `description` (Text): For AI context
- `createdAt` (DateTime)

## Relationships

- Student (1) -- (N) ApiKey
- Student (1) -- (N) Document
- Student (1) -- (N) Resource
- Document (1) -- (N) Resource (optional link)
