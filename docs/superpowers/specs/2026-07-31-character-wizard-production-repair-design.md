# Character Wizard Production Repair Design

## Goal

Make Surprise controls visibly useful, make Review explain exactly what will be created, and prevent benign appearance descriptions from failing as unsafe while preserving child-safety moderation.

## Confirmed causes

- Surprise controls currently clear their associated value and set an invisible boolean flag, so Name and Type appear unchanged or blank.
- Review renders only slot, cost, and balance values without labels or the selected character details.
- The production generation job was accepted but failed with `unsafe_input` for the benign description “Short hair and tan skin.”
- The frontend discards terminal generation error codes and replaces them with one generic failure message.

## Interaction design

Each Surprise control immediately chooses and displays a concrete value. Name chooses from a small language-aware child-safe name pool; Type and Gender choose from their existing allowed option lists. The chosen values become ordinary explicit inputs so Review and the generated result agree.

Review contains:

- an Identity section with Name, Type, and Gender;
- a Personality section with selected trait labels and the optional description;
- a Generation section with labeled Slot, Cost, Current credits, and Credits after;
- Back and Create Character actions.

Empty optional personality fields render “None selected” or “No extra details” instead of leaving unexplained whitespace.

## Safety and failure behavior

Backend moderation retains AI review but uses an explicit child-safety policy. Ordinary descriptions of hair, skin tone, clothing, mobility aids, body shape, and fantasy features are explicitly permitted. Sexual content, graphic violence, hate, self-harm, illegal activity, exploitation, and prompt-injection attempts remain rejected.

Terminal job error codes are preserved by the wizard. `unsafe_input` displays an actionable message telling the user to revise Name or Details and offers an Edit details action. Other generation failures retain the generic retry flow.

## Testing

- Web tests prove every Surprise control displays a valid value and submits it explicitly.
- Web tests prove Review renders identity, personality, and labeled generation details.
- Web tests prove `unsafe_input` produces actionable recovery instead of the generic failure.
- Backend tests prove the moderation prompt explicitly permits benign appearance descriptions and still enumerates unsafe categories.
- Existing create/edit, worker, credit, theme, and full web suites remain green.

## Deployment

Capture Deploy Guard snapshot before mutation. Deploy the backend generator and web wizard as scoped files, keep rollback bundles, verify API and character worker health, then run Deploy Guard on production. The known external YouTube broadcast result remains separately reported without weakening application checks.
