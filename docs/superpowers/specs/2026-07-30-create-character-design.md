# Create Character Design

Date: 2026-07-30

## Goal

Create a signed-in character-generation experience that produces and immediately saves both a reusable character profile and a fixed-style Dream Valley portrait. Saved characters appear in My Content and can later be selected during content creation.

## Scope

This release includes:

- A three-step Create Character wizard.
- Text-only character inputs.
- AI-generated structured profiles and portraits.
- Thirty persistent character slots per user.
- Character detail, edit, and delete flows.
- Asynchronous generation with durable progress and recovery.
- Atomic slot and credit accounting.
- Saved-character cards in the My Content Characters shelf.

This release does not include reference-image uploads, selectable art styles, voice assignment, or story creation from a character. The result page does not show “Use in a story” until content creation launches.

## Entry and Navigation

The Create Character card on My Content navigates to `/characters/create`. Signed-out users are redirected to login before the wizard is shown.

Saved character cards appear before locked preview cards in the My Content Characters shelf. Selecting a saved card opens `/characters/[id]`, which shows the portrait and profile with Edit and Delete actions.

## Wizard

### Step 1: Identity

The user chooses:

- Name: up to 40 characters, or Surprise me.
- Type: a curated dropdown, or Surprise me.
- Gender: a curated dropdown, or Surprise me.

Initial type choices are Human child, Cat, Dog, Fox, Rabbit, Bear, Bird, Dragon, Unicorn, Robot, Mermaid, Fairy, and Nature spirit.

Initial gender choices are Girl, Boy, Non-binary, and Not specified.

There is no free-text type or gender input in this release. Surprise me leaves that field for the generator to resolve.

### Step 2: Personality

The user can select up to five curated traits and optionally add a custom description of up to 300 characters.

Initial traits are Brave, Curious, Kind, Playful, Gentle, Wise, Funny, Shy, Creative, Loyal, Adventurous, Calm, Dreamy, and Clever.

The selected traits and custom description are combined. Neither is individually required; the generator can safely complete missing personality details.

### Step 3: Review

The Review step shows:

- Resolved user inputs, with Surprise me fields clearly marked.
- The slot that will be used.
- Whether the generation is free or costs 2 credits.
- Current balance and projected balance after success.

A paid generation requires a confirmation dialog that repeats the 2-credit charge and projected balance. The server revalidates the quote when the job is submitted.

### Generating and Result

Submission creates a durable asynchronous job and transitions the page to a progress state. Refreshing or reopening the page resumes the same job.

When both outputs succeed, the character is saved immediately and the result page displays its portrait, name, type, gender, traits, and profile summary. The result page offers Done, Edit, and Delete.

## Slot and Credit Rules

Each user has fixed slots numbered 1 through 30.

- Creating into an available slot numbered 1, 2, or 3 is free.
- Creating into slots 4 through 30 costs 2 credits.
- Editing any existing character is a new generation and costs 2 credits, including edits to characters in slots 1 through 3.
- Deleting a character frees its exact slot. A later creation uses the lowest available slot and follows that slot’s price.
- A user cannot have more than 30 active or pending character slots.
- Failed or timed-out jobs cost nothing.

Slots and credits are reserved when a job is accepted so parallel requests cannot exceed the slot cap or available balance. A reservation is not a deduction. Credits are deducted only after the generated profile, portrait, and character record have all been saved successfully. Failure releases the reservation.

Credit consumption follows the existing application debit order and monthly/top-up credit rules.

## Architecture

### Web

The web app adds:

- `/characters/create`: wizard, quote, confirmation, submission, progress, and result.
- `/characters/[id]`: detail and delete.
- `/characters/[id]/edit`: the wizard prefilled from the current character.
- A character API client that handles quotes, jobs, polling, listing, and deletion.
- Saved character rendering in the My Content Characters shelf.

Wizard state is local until submission. A submitted job ID is persisted so reloads resume progress without creating a duplicate job.

### Backend

The backend adds authenticated character CRUD and generation-job endpoints:

- `GET /characters`
- `GET /characters/{character_id}`
- `POST /characters/quote`
- `POST /characters/generations`
- `GET /characters/generations/{job_id}`
- `POST /characters/{character_id}/generations`
- `DELETE /characters/{character_id}`

The API validates ownership, inputs, slot capacity, and credit availability. Generation work runs outside the request lifecycle in a dedicated worker backed by durable job records. API or worker restarts do not lose accepted jobs.

### Generation Pipeline

The worker:

1. Claims an accepted job idempotently.
2. Generates a structured character profile.
3. Validates the profile against the character schema.
4. Builds a child-safe portrait prompt in the fixed Dream Valley illustration style.
5. Generates and stores the portrait.
6. Atomically saves the character version and deducts reserved credits.
7. Marks the job complete.

For edits, the existing character remains active until the replacement profile and portrait are ready. Successful completion replaces the active version atomically. Failed edits preserve the previous character unchanged.

## Data Model

### Character

A character contains:

- `id`
- `user_id`
- `slot_number`
- `name`
- `type`
- `gender`
- `traits`
- `custom_description`
- `profile_summary`
- `portrait_url`
- `version`
- `created_at`
- `updated_at`

Only the owner can list, read, edit, or delete the record.

### Generation Job

A generation job contains:

- `id`
- `user_id`
- `mode`: create or edit
- `target_character_id` for edits
- Submitted wizard inputs
- Reserved slot
- Reserved credit amount
- Quote version
- `status`: accepted, generating_profile, generating_portrait, saving, completed, or failed
- Safe error code
- Result character ID
- Creation, update, and expiry timestamps

Submission uses an idempotency key so retries cannot create duplicate jobs or reservations.

## Safety

User inputs are length-limited and moderated. Generated text must pass child-safety checks and strict schema validation before it can influence the portrait prompt or be saved.

Portrait prompts enforce the fixed Dream Valley style, age-appropriate imagery, no text in the image, and no photorealistic or sexualized depiction. User-provided reference images are not accepted.

API responses expose safe error codes rather than model-provider details. Character ownership is enforced on every read and mutation.

## Error Handling

- Invalid fields remain on the relevant wizard step with specific messages.
- A stale quote, changed balance, or newly occupied slot returns a conflict and refreshes the Review step.
- Insufficient credits blocks submission and links to the existing upgrade/top-up experience.
- A failed profile, portrait, upload, or save releases all reservations and offers Retry.
- A timed-out worker job is reclaimed or failed idempotently; it cannot double-charge.
- Edit failures keep the previous character and portrait.
- Delete requires confirmation, immediately frees the slot, and queues media cleanup.

## Testing

Backend tests cover:

- Free creation in slots 1 through 3.
- Paid creation in slots 4 through 30.
- Reuse of a deleted slot at that slot’s price.
- All edits costing 2 credits.
- Thirty-slot enforcement including pending jobs.
- Parallel submissions and reservation conflicts.
- Insufficient and frozen credits.
- Success-only deduction and failure release.
- Idempotent submission, worker retry, and completion.
- Ownership, moderation, and schema validation.

Web tests cover:

- Authentication redirect.
- Wizard validation, Surprise me, curated choices, and trait limits.
- Free and paid Review states.
- Paid confirmation.
- Submission deduplication, progress polling, refresh recovery, retry, and result.
- Detail, edit, and delete.
- Saved-character ordering before locked previews.
- Keyboard and screen-reader behavior.

Production verification covers durable job recovery, portrait availability, exact credit accounting, slot reuse, My Content rendering, and regression checks for existing story generation and subscription balances.

## Success Criteria

- A signed-in user can generate and immediately save a profile and portrait.
- The first three fixed slots are reusable and free for new characters.
- Slots 4 through 30 and all edits charge exactly 2 credits after success.
- Failed work never consumes credits or replaces a working character.
- Parallel requests cannot exceed slots or balance.
- Saved characters appear first in My Content and open their detail pages.
- The flow is recoverable after refresh or backend restart.
