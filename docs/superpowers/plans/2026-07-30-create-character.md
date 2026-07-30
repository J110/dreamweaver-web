# Create Character Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a signed-in three-step character creator that asynchronously generates and immediately saves a reusable profile and fixed-style portrait with thirty-slot and success-only credit accounting.

**Architecture:** FastAPI owns authenticated character records, transactional slot/credit reservations, durable jobs, and a separately deployed worker. The Next.js app owns the wizard, quote/confirmation flow, job recovery, character details, and My Content integration. Firestore-compatible transactions make submission and finalization idempotent; the worker keeps the current character intact until an edit succeeds.

**Tech Stack:** Next.js 14, React, Jest, FastAPI, Pydantic, Firestore-compatible database client, Groq text generation, existing HTTP image providers, Pillow, PM2, Deploy Guard.

## Global Constraints

- Work in `/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-web/.worktrees/my-content-redesign` and `/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-backend/.worktrees/my-content-credits`.
- Preserve the backend worktree’s existing changes to `data/content.json`, `data/deploy_golden.json`, and `seed_output/content.json`.
- Require authentication for every character route and mutation.
- Accept text inputs only; do not add reference-image upload.
- Use one fixed child-safe Dream Valley portrait style.
- Provide exactly 30 fixed slots; new characters in available slots 1–3 are free, slots 4–30 cost 2 credits, and every edit costs 2 credits.
- Deduct credits only after the profile, portrait, and character record all save successfully.
- Keep existing characters unchanged when an edit fails.
- Do not expose “Use in a story” before content creation launches.
- Do not add a package dependency; use existing FastAPI, Pydantic, httpx, Pillow, Groq, React, and Jest facilities.
- Preserve Premium Emberlight styling and the existing free indigo shell.
- Return portraits from `https://api.dreamvalley.app/media/characters/*`; never depend on the web host serving backend media.

---

### Task 1: Shared credit reservations and debit rules

**Files:**
- Modify: `dreamweaver-backend/.worktrees/my-content-credits/app/dependencies.py`
- Modify: `dreamweaver-backend/.worktrees/my-content-credits/app/utils/credits.py`
- Modify: `dreamweaver-backend/.worktrees/my-content-credits/app/api/v1/subscriptions.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/scripts/test_character_credit_reservations.py`

**Interfaces:**
- Consumes: existing `available_credit_total(user_data)`, `update_user_credit_state(db_client, uid, updater)`.
- Produces: `reserve_credit_fields(user_data, amount) -> dict`, `release_credit_fields(user_data, amount) -> dict`, `debit_reserved_credit_fields(user_data, amount) -> dict`.

- [ ] **Step 1: Write failing reservation tests**

```python
from app.utils.credits import (
    available_credit_total,
    debit_reserved_credit_fields,
    release_credit_fields,
    reserve_credit_fields,
)


def test_reserved_credits_are_not_available():
    user = {"credits_remaining": 3, "topup_credits_remaining": 4, "credits_reserved": 0}
    user.update(reserve_credit_fields(user, 2))
    assert user["credits_reserved"] == 2
    assert available_credit_total(user) == 5


def test_success_debits_monthly_first_and_releases_reservation():
    user = {"credits_remaining": 1, "topup_credits_remaining": 4, "credits_reserved": 2}
    user.update(debit_reserved_credit_fields(user, 2))
    assert user == {
        "credits_remaining": 0,
        "topup_credits_remaining": 3,
        "credits_reserved": 0,
    }


def test_failure_only_releases_reservation():
    user = {"credits_remaining": 3, "topup_credits_remaining": 4, "credits_reserved": 2}
    user.update(release_credit_fields(user, 2))
    assert user["credits_remaining"] == 3
    assert user["topup_credits_remaining"] == 4
    assert user["credits_reserved"] == 0
```

- [ ] **Step 2: Run the tests and confirm the missing functions fail**

Run:

```bash
cd "/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-backend/.worktrees/my-content-credits"
python3 -m pytest scripts/test_character_credit_reservations.py -q
```

Expected: collection fails because the three reservation functions do not exist.

- [ ] **Step 3: Implement reservation-aware credit helpers**

```python
def available_credit_total(user_data: dict) -> int:
    if user_data.get("credits_frozen"):
        return 0
    monthly = max(0, int(user_data.get("credits_remaining") or 0))
    topups = max(0, int(user_data.get("topup_credits_remaining") or 0))
    reserved = max(0, int(user_data.get("credits_reserved") or 0))
    return max(0, monthly + topups - reserved)


def reserve_credit_fields(user_data: dict, amount: int) -> dict:
    amount = max(0, int(amount))
    if available_credit_total(user_data) < amount:
        raise ValueError("insufficient_credits")
    return {"credits_reserved": max(0, int(user_data.get("credits_reserved") or 0)) + amount}


def release_credit_fields(user_data: dict, amount: int) -> dict:
    reserved = max(0, int(user_data.get("credits_reserved") or 0))
    return {"credits_reserved": max(0, reserved - max(0, int(amount)))}


def debit_reserved_credit_fields(user_data: dict, amount: int) -> dict:
    amount = max(0, int(amount))
    monthly = max(0, int(user_data.get("credits_remaining") or 0))
    topups = max(0, int(user_data.get("topup_credits_remaining") or 0))
    from_monthly = min(monthly, amount)
    from_topups = amount - from_monthly
    if topups < from_topups:
        raise ValueError("reserved_credit_missing")
    return {
        "credits_remaining": monthly - from_monthly,
        "topup_credits_remaining": topups - from_topups,
        **release_credit_fields(user_data, amount),
    }
```

Add `credits_reserved: 0` to lazy user defaults and surface it in the current subscription response while keeping `credits_total` equal to spendable credits.

- [ ] **Step 4: Run focused and existing credit tests**

Run:

```bash
python3 -m pytest scripts/test_character_credit_reservations.py scripts/test_monthly_credits.py scripts/test_subscription_credit_contract.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit the backend credit contract**

```bash
git add app/dependencies.py app/utils/credits.py app/api/v1/subscriptions.py scripts/test_character_credit_reservations.py
git commit -m "feat(characters): add credit reservations"
```

---

### Task 2: Character schemas, slots, and transactional repository

**Files:**
- Create: `dreamweaver-backend/.worktrees/my-content-credits/app/schemas/character_schema.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/app/services/characters/__init__.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/app/services/characters/domain.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/app/services/characters/repository.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/scripts/character_test_helpers.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/scripts/test_character_repository.py`

**Interfaces:**
- Consumes: Task 1 credit helpers.
- Produces: `CharacterInput`, `CharacterQuote`, `CharacterRecord`, `GenerationJob`; `quote_generation(uid: str, mode: str, target_character_id: str | None) -> CharacterQuote`, `accept_generation(uid: str, request: GenerationRequest, target_character_id: str | None) -> GenerationJob`, `complete_generation(job_id: str, profile: dict, portrait_url: str) -> CharacterRecord`, `fail_generation(job_id: str, error_code: str) -> GenerationJob`, `delete_character(uid: str, character_id: str) -> None`.

- [ ] **Step 1: Write failing slot and repository tests**

```python
from app.schemas.character_schema import CharacterInput, GenerationRequest
from scripts.character_test_helpers import create_request, edit_request


def test_quote_uses_lowest_free_slot_and_slot_price(fake_repo):
    fake_repo.seed_character("u1", slot_number=2)
    assert fake_repo.quote_generation("u1", mode="create").model_dump() == {
        "slot_number": 1,
        "credit_cost": 0,
        "credits_before": 3,
        "credits_after": 3,
        "quote_version": fake_repo.quote_version("u1"),
    }


def test_slot_four_costs_two_credits(fake_repo):
    for slot in (1, 2, 3):
        fake_repo.seed_character("u1", slot_number=slot)
    assert fake_repo.quote_generation("u1", mode="create").credit_cost == 2


def test_edit_always_costs_two_credits(fake_repo):
    character = fake_repo.seed_character("u1", slot_number=1)
    assert fake_repo.quote_generation(
        "u1", mode="edit", target_character_id=character["id"]
    ).credit_cost == 2


def test_accept_is_idempotent_and_reserves_once(fake_repo):
    request = create_request(idempotency_key="character-generation-same")
    first = fake_repo.accept_generation("u1", request)
    second = fake_repo.accept_generation("u1", request)
    assert first["id"] == second["id"]
    assert fake_repo.user("u1")["credits_reserved"] == first["reserved_credit_amount"]


def test_failed_edit_preserves_character_and_releases_credit(fake_repo):
    original = fake_repo.seed_character("u1", slot_number=1, version=3)
    job = fake_repo.accept_generation(
        "u1",
        edit_request(original, idempotency_key="character-generation-edit"),
        target_character_id=original["id"],
    )
    fake_repo.fail_generation(job["id"], "portrait_failed")
    assert fake_repo.character(original["id"])["version"] == 3
    assert fake_repo.user("u1")["credits_reserved"] == 0
```

- [ ] **Step 2: Run the repository tests and confirm they fail**

Run:

```bash
python3 -m pytest scripts/test_character_repository.py -q
```

Expected: import fails because the character schemas and repository do not exist.

- [ ] **Step 3: Define exact schemas and curated values**

```python
CHARACTER_TYPES = (
    "human_child", "cat", "dog", "fox", "rabbit", "bear", "bird",
    "dragon", "unicorn", "robot", "mermaid", "fairy", "nature_spirit",
)
CHARACTER_GENDERS = ("girl", "boy", "non_binary", "not_specified")
CHARACTER_TRAITS = (
    "brave", "curious", "kind", "playful", "gentle", "wise", "funny",
    "shy", "creative", "loyal", "adventurous", "calm", "dreamy", "clever",
)


class CharacterInput(BaseModel):
    name: str | None = Field(default=None, max_length=40)
    surprise_name: bool = False
    character_type: Literal[*CHARACTER_TYPES] | None = None
    surprise_type: bool = False
    gender: Literal[*CHARACTER_GENDERS] | None = None
    surprise_gender: bool = False
    traits: list[Literal[*CHARACTER_TRAITS]] = Field(default_factory=list, max_length=5)
    custom_description: str = Field(default="", max_length=300)


class GenerationRequest(BaseModel):
    inputs: CharacterInput
    quote_version: str
    idempotency_key: str = Field(min_length=16, max_length=100)
```

Add response models for the fields specified in the design, including safe status and error-code enums.

`scripts/character_test_helpers.py` provides a lock-backed Firestore-compatible fake, the `fake_repo` fixture, `create_request`, `paid_create_request`, `edit_request`, `seed_user`, `seed_character`, `FakeGenerator`, and deterministic profile/image fixtures. Later backend character tests import these names instead of defining incompatible fakes.

- [ ] **Step 4: Implement repository transactions**

Use collections:

```text
characters
character_generation_jobs
character_slot_counters
users
```

The slot counter document is keyed by user ID and stores `occupied_slots`, `reserved_slots`, and `revision`. `accept_generation` runs one Firestore-compatible transaction that:

```python
def accept_generation(self, uid, request, target_character_id=None):
    # Return the existing job for uid + idempotency_key.
    # Re-read user, counter, target character, and quote_version.
    # Select the lowest free slot for create; keep target slot for edit.
    # Cost: create slot <= 3 => 0, otherwise 2; every edit => 2.
    # Reserve slot and user credits, persist accepted job, increment revision.
    # Reject with safe codes: stale_quote, no_slots, insufficient_credits,
    # credits_frozen, not_found, or forbidden.
```

`complete_generation` atomically writes the new character/version, converts the reservation into a debit, clears reserved slot/credits, and completes the job. `fail_generation` idempotently clears reservations without a debit. `delete_character` confirms ownership, deletes the record, frees the exact occupied slot, and creates a media-cleanup marker.

- [ ] **Step 5: Run repository and credit tests**

Run:

```bash
python3 -m pytest scripts/test_character_repository.py scripts/test_character_credit_reservations.py -q
```

Expected: all tests pass, including parallel acceptance simulated through the fake transaction lock.

- [ ] **Step 6: Commit the character domain**

```bash
git add app/schemas/character_schema.py app/services/characters scripts/character_test_helpers.py scripts/test_character_repository.py
git commit -m "feat(characters): add slots and generation jobs"
```

---

### Task 3: Authenticated character API

**Files:**
- Create: `dreamweaver-backend/.worktrees/my-content-credits/app/api/v1/characters.py`
- Modify: `dreamweaver-backend/.worktrees/my-content-credits/app/api/v1/router.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/scripts/test_character_api.py`

**Interfaces:**
- Consumes: Task 2 schemas and repository.
- Produces: `/api/v1/characters` list/detail/quote/generation/delete endpoints.

- [ ] **Step 1: Write failing API contract tests**

```python
def test_all_character_routes_require_auth(client):
    paths = [
        ("GET", "/api/v1/characters"),
        ("POST", "/api/v1/characters/quote"),
        ("POST", "/api/v1/characters/generations"),
        ("GET", "/api/v1/characters/generations/job-1"),
    ]
    for method, path in paths:
        assert client.request(method, path, json={} if method == "POST" else None).status_code == 401


def test_quote_returns_slot_and_projected_balance(authed_client):
    response = authed_client.post(
        "/api/v1/characters/quote",
        json={"mode": "create", "target_character_id": None},
    )
    assert response.status_code == 200
    assert response.json()["data"]["slot_number"] == 1
    assert response.json()["data"]["credit_cost"] == 0


def test_submit_returns_202_and_same_job_for_retry(authed_client):
    body = generation_body(idempotency_key="character-generation-0001")
    first = authed_client.post("/api/v1/characters/generations", json=body)
    second = authed_client.post("/api/v1/characters/generations", json=body)
    assert first.status_code == second.status_code == 202
    assert first.json()["data"]["id"] == second.json()["data"]["id"]
```

- [ ] **Step 2: Run the API tests and confirm the route is missing**

Run:

```bash
python3 -m pytest scripts/test_character_api.py -q
```

Expected: requests return 404 because the router is not registered.

- [ ] **Step 3: Implement the authenticated router**

```python
router = APIRouter()


@router.get("")
async def list_characters(
    current_user: dict = Depends(get_current_user),
    db_client=Depends(get_db_client),
):
    return {"success": True, "data": CharacterRepository(db_client).list(current_user["uid"])}


@router.post("/quote")
async def quote_character(
    request: QuoteRequest,
    current_user: dict = Depends(get_current_user),
    db_client=Depends(get_db_client),
):
    quote = CharacterRepository(db_client).quote_generation(
        current_user["uid"], request.mode, request.target_character_id
    )
    return {"success": True, "data": quote.model_dump()}


@router.post("/generations", status_code=202)
async def create_generation(
    request: GenerationRequest,
    current_user: dict = Depends(get_current_user),
    db_client=Depends(get_db_client),
):
    job = CharacterRepository(db_client).accept_generation(
        current_user["uid"], request, target_character_id=None
    )
    return {"success": True, "data": job.model_dump()}


@router.post("/{character_id}/generations", status_code=202)
async def edit_generation(
    character_id: str,
    request: GenerationRequest,
    current_user: dict = Depends(get_current_user),
    db_client=Depends(get_db_client),
):
    job = CharacterRepository(db_client).accept_generation(
        current_user["uid"], request, target_character_id=character_id
    )
    return {"success": True, "data": job.model_dump()}
```

Implement list, detail, quote, create job, edit job, job status, and delete. Map repository codes to 404, 409, 422, or 402 while returning structured `detail.code`.

Register:

```python
router.include_router(characters_router, prefix="/characters", tags=["Characters"])
```

- [ ] **Step 4: Run API, repository, auth, and credit tests**

Run:

```bash
python3 -m pytest scripts/test_character_api.py scripts/test_character_repository.py scripts/test_auth_token_ttl.py scripts/test_monthly_credits.py -q
```

Expected: all tests pass.

- [ ] **Step 5: Commit the authenticated API**

```bash
git add app/api/v1/characters.py app/api/v1/router.py scripts/test_character_api.py
git commit -m "feat(characters): expose generation API"
```

---

### Task 4: Child-safe profile and portrait generator

**Files:**
- Create: `dreamweaver-backend/.worktrees/my-content-credits/app/services/characters/generator.py`
- Modify: `dreamweaver-backend/.worktrees/my-content-credits/app/config.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/scripts/test_character_generator.py`

**Interfaces:**
- Consumes: `CharacterInput`, existing `GroqService.generate_text`, existing httpx/Pillow stack.
- Produces: `GeneratedProfile(name, character_type, gender, traits, profile_summary, portrait_prompt)`, `CharacterGenerator.generate_profile(inputs) -> GeneratedProfile`, and `CharacterGenerator.generate_portrait(profile) -> bytes`.

- [ ] **Step 1: Write failing generator tests with provider fakes**

```python
def test_generator_resolves_surprise_fields_and_returns_webp(tmp_path):
    generator = CharacterGenerator(
        text_client=FakeTextClient(PROFILE_JSON),
        image_client=FakeImageClient(PORTRAIT_PNG),
    )
    profile = generator.generate_profile(
        CharacterInput(
            surprise_name=True,
            surprise_type=True,
            surprise_gender=True,
            traits=["kind", "dreamy"],
        )
    )
    portrait = generator.generate_portrait(profile)
    assert profile.name == "Lumi"
    assert profile.character_type == "fox"
    assert portrait[:4] == b"RIFF"


def test_unsafe_input_fails_closed_before_image_call():
    image = FakeImageClient(PORTRAIT_PNG)
    generator = CharacterGenerator(
        text_client=FakeTextClient('{"allowed": false, "reason": "unsafe"}'),
        image_client=image,
    )
    with pytest.raises(CharacterGenerationError, match="unsafe_input"):
        generator.generate_profile(CharacterInput(name="unsafe example"))
    assert image.calls == 0


def test_invalid_profile_schema_never_generates_portrait():
    image = FakeImageClient(PORTRAIT_PNG)
    generator = CharacterGenerator(
        text_client=FakeTextClient('{"name": ""}'),
        image_client=image,
    )
    with pytest.raises(CharacterGenerationError, match="invalid_profile"):
        generator.generate_profile(CharacterInput(surprise_name=True))
    assert image.calls == 0
```

- [ ] **Step 2: Run the generator tests and confirm the module is missing**

Run:

```bash
python3 -m pytest scripts/test_character_generator.py -q
```

Expected: import fails because `CharacterGenerator` does not exist.

- [ ] **Step 3: Implement strict profile generation**

Build a moderation prompt that returns only:

```json
{"allowed": true, "reason": "safe"}
```

Then build a profile prompt requiring:

```json
{
  "name": "Lumi",
  "type": "fox",
  "gender": "not_specified",
  "traits": ["kind", "dreamy"],
  "profile_summary": "A gentle moon fox who collects fallen stars.",
  "portrait_prompt": "A warm full-body storybook portrait of Lumi under soft moonlight."
}
```

Validate the response with Pydantic. The fixed portrait suffix must require a warm storybook illustration, soft Dream Valley lighting, full character visibility, age-appropriate clothing/anatomy, no photorealism, no words, no logo, and no watermark.

- [ ] **Step 4: Implement provider fallback and WebP normalization**

Use existing environment keys and provider order:

```python
class CharacterImageClient:
    def generate(self, prompt: str) -> bytes:
        for provider in (
            self._generate_fluxapi,
            self._generate_pollinations,
            self._generate_replicate,
        ):
            image = provider(prompt)
            if image:
                return normalize_portrait_webp(image, width=768, height=960)
        raise CharacterGenerationError("portrait_failed")
```

Add `CHARACTER_MEDIA_DIR` with default `data/character-media` and `PUBLIC_API_BASE_URL` with default `http://localhost:8000`; do not write media during this task.

- [ ] **Step 5: Run generator tests**

Run:

```bash
python3 -m pytest scripts/test_character_generator.py -q
```

Expected: safe output passes; unsafe, malformed, and provider-failure cases return safe errors without partial media.

- [ ] **Step 6: Commit the generator**

```bash
git add app/services/characters/generator.py app/config.py scripts/test_character_generator.py
git commit -m "feat(characters): generate safe profiles and portraits"
```

---

### Task 5: Durable worker, media serving, and recovery

**Files:**
- Create: `dreamweaver-backend/.worktrees/my-content-credits/app/services/characters/worker.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/scripts/run_character_worker.py`
- Modify: `dreamweaver-backend/.worktrees/my-content-credits/app/main.py`
- Modify: `dreamweaver-backend/.worktrees/my-content-credits/scripts/deploy_guard.py`
- Create: `dreamweaver-backend/.worktrees/my-content-credits/scripts/test_character_worker.py`
- Modify: `dreamweaver-backend/.worktrees/my-content-credits/scripts/test_deploy_guard_regression_contracts.py`

**Interfaces:**
- Consumes: Tasks 2 and 4 repository/generator.
- Produces: `CharacterWorker.run_once() -> bool`, `/media/characters/*`, executable worker process.

- [ ] **Step 1: Write failing worker lifecycle tests**

```python
def test_worker_completes_job_saves_media_and_debits_once(tmp_path, fake_repo):
    job = fake_repo.accept_generation("u1", paid_create_request("character-worker-job-1"))
    worker = CharacterWorker(
        repository=fake_repo,
        generator=FakeGenerator(GENERATED_PROFILE, PORTRAIT_WEBP),
        media_dir=tmp_path,
        worker_id="test-worker",
    )
    assert worker.run_once() is True
    completed = fake_repo.job(job["id"])
    character = fake_repo.character(completed["result_character_id"])
    assert completed["status"] == "completed"
    assert (tmp_path / character["portrait_filename"]).exists()
    assert fake_repo.user("u1")["credits_remaining"] == 1
    assert worker.run_once() is False
    assert fake_repo.user("u1")["credits_remaining"] == 1


def test_worker_failure_removes_partial_media_and_releases_reservation(tmp_path, fake_repo):
    job = fake_repo.accept_generation("u1", paid_create_request("character-worker-job-2"))
    worker = CharacterWorker(fake_repo, FailingGenerator(), tmp_path, "test-worker")
    assert worker.run_once() is True
    assert fake_repo.job(job["id"])["status"] == "failed"
    assert list(tmp_path.iterdir()) == []
    assert fake_repo.user("u1")["credits_reserved"] == 0


def test_expired_lease_is_reclaimed(tmp_path, fake_repo):
    fake_repo.seed_expired_generating_job("job-3")
    assert CharacterWorker(
        fake_repo,
        FakeGenerator(GENERATED_PROFILE, PORTRAIT_WEBP),
        tmp_path,
        "new",
    ).run_once()


def test_worker_removes_media_for_claimed_cleanup(tmp_path, fake_repo):
    portrait = tmp_path / "c1-v1.webp"
    portrait.write_bytes(b"portrait")
    fake_repo.seed_media_cleanup("cleanup-1", portrait.name)
    worker = CharacterWorker(
        fake_repo,
        FakeGenerator(GENERATED_PROFILE, PORTRAIT_WEBP),
        tmp_path,
        "worker",
    )
    assert worker.run_cleanup_once() is True
    assert not portrait.exists()
    assert fake_repo.media_cleanup("cleanup-1")["status"] == "completed"
```

- [ ] **Step 2: Run worker tests and confirm the worker is missing**

Run:

```bash
python3 -m pytest scripts/test_character_worker.py -q
```

Expected: import fails because `CharacterWorker` does not exist.

- [ ] **Step 3: Implement leasing and idempotent completion**

```python
class CharacterWorker:
    def run_once(self) -> bool:
        job = self.repository.claim_next_job(
            worker_id=self.worker_id,
            lease_seconds=300,
        )
        if not job:
            return False
        portrait_path = None
        try:
            self.repository.mark_stage(job["id"], "generating_profile")
            profile = self.generator.generate_profile(CharacterInput(**job["inputs"]))
            self.repository.mark_stage(job["id"], "generating_portrait")
            portrait_bytes = self.generator.generate_portrait(profile)
            self.repository.mark_stage(job["id"], "saving")
            portrait_path = self._write_portrait_atomically(job, portrait_bytes)
            self.repository.complete_generation(
                job["id"],
                profile.model_dump(),
                portrait_url=(
                    f"{settings.public_api_base_url.rstrip('/')}"
                    f"/media/characters/{portrait_path.name}"
                ),
            )
        except Exception as exc:
            if portrait_path:
                portrait_path.unlink(missing_ok=True)
            self.repository.fail_generation(job["id"], safe_error_code(exc))
        return True
```

The runner processes claimed media-cleanup records before generation jobs, loops with a two-second idle delay, handles SIGTERM, and exits nonzero only for process-level initialization failures.

- [ ] **Step 4: Mount durable character media**

Create the configured directory during startup and mount:

```python
app.mount(
    "/media/characters",
    StaticFiles(directory=str(settings.character_media_dir)),
    name="character-media",
)
```

Serve immutable filenames containing character ID and version; never overwrite an active file.

- [ ] **Step 5: Extend Deploy Guard**

Add snapshot fields for active characters and pending jobs. Verification must require:

```text
GET /api/v1/characters without authentication returns 401
dreamweaver-character-worker is online
CHARACTER_MEDIA_DIR exists and is writable by the backend user
every stored portrait URL returns HTTP 200
no accepted/generating job is older than its lease plus recovery window
```

Add contract assertions to `test_deploy_guard_regression_contracts.py` so none of these checks can be silently removed.

- [ ] **Step 6: Run worker, repository, generator, and guard tests**

Run:

```bash
python3 -m pytest \
  scripts/test_character_worker.py \
  scripts/test_character_repository.py \
  scripts/test_character_generator.py \
  scripts/test_deploy_guard_regression_contracts.py -q
```

Expected: all tests pass, including retries and failed-edit preservation.

- [ ] **Step 7: Commit worker, media, and guard support**

```bash
git add \
  app/services/characters/worker.py \
  scripts/run_character_worker.py \
  app/main.py \
  scripts/test_character_worker.py \
  scripts/deploy_guard.py \
  scripts/test_deploy_guard_regression_contracts.py
git commit -m "feat(characters): process durable generation jobs"
```

---

### Task 6: Web character API and wizard state

**Files:**
- Modify: `dreamweaver-web/.worktrees/my-content-redesign/src/utils/api.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/utils/characterWizard.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/utils/characterWizard.test.js`

**Interfaces:**
- Consumes: Task 3 API response shapes.
- Produces: `characterApi`; `validateIdentity`, `validatePersonality`, `createIdempotencyKey`, `savePendingJob`, `loadPendingJob`, `clearPendingJob`.

- [ ] **Step 1: Write failing state and validation tests**

```javascript
import {
  createIdempotencyKey,
  validateIdentity,
  validatePersonality,
} from './characterWizard';

test('identity accepts explicit values or surprise flags', () => {
  expect(validateIdentity({
    name: '',
    surpriseName: true,
    characterType: '',
    surpriseType: true,
    gender: 'not_specified',
    surpriseGender: false,
  })).toEqual({});
});

test('personality limits traits and description', () => {
  expect(validatePersonality({
    traits: ['brave', 'curious', 'kind', 'playful', 'gentle', 'wise'],
    customDescription: 'x'.repeat(301),
  })).toEqual({
    traits: 'Choose up to 5 traits',
    customDescription: 'Keep details under 300 characters',
  });
});

test('idempotency keys are stable for one submission and nonempty', () => {
  expect(createIdempotencyKey()).toMatch(/^character-[a-z0-9-]{16,}$/);
});
```

- [ ] **Step 2: Run the utility test and confirm missing exports**

Run:

```bash
npm test -- --runInBand src/utils/characterWizard.test.js
```

Expected: import fails because `characterWizard.js` does not exist.

- [ ] **Step 3: Implement constants, validation, and pending-job storage**

Export the exact curated values from the design. Store only:

```javascript
{
  jobId,
  mode,
  targetCharacterId,
  startedAt
}
```

under a user-scoped key `dv_character_job:<uid>`. Do not persist unsent custom descriptions.

- [ ] **Step 4: Add the API client**

```javascript
export const characterApi = {
  list: async ({ fresh = false } = {}) => {
    if (fresh) fetchApi.invalidate('/api/v1/characters');
    const res = await fetchApi('/api/v1/characters');
    return res.data || [];
  },
  get: async (id) => (await fetchApi(`/api/v1/characters/${id}`)).data,
  quote: async (mode, targetCharacterId = null) => (
    await fetchApi('/api/v1/characters/quote', {
      method: 'POST',
      body: JSON.stringify({ mode, target_character_id: targetCharacterId }),
    })
  ).data,
  createGeneration: async (body) => (
    await fetchApi('/api/v1/characters/generations', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  ).data,
  editGeneration: async (id, body) => (
    await fetchApi(`/api/v1/characters/${id}/generations`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  ).data,
  generation: async (jobId, { fresh = true } = {}) => {
    const endpoint = `/api/v1/characters/generations/${jobId}`;
    if (fresh) fetchApi.invalidate(endpoint);
    return (await fetchApi(endpoint)).data;
  },
  remove: async (id) => fetchApi(`/api/v1/characters/${id}`, { method: 'DELETE' }),
};
```

- [ ] **Step 5: Run utility tests**

Run:

```bash
npm test -- --runInBand src/utils/characterWizard.test.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit web data contracts**

```bash
git add src/utils/api.js src/utils/characterWizard.js src/utils/characterWizard.test.js
git commit -m "feat(characters): add web generation client"
```

---

### Task 7: Three-step Create Character wizard

**Files:**
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/components/characters/CharacterWizard.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/components/characters/GenerationProgress.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/components/characters/PaidGenerationDialog.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/app/characters/create/page.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/app/characters/create/page.module.css`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/app/characters/create/page.test.js`
- Modify: `dreamweaver-web/.worktrees/my-content-redesign/src/utils/i18n.js`

**Interfaces:**
- Consumes: Task 6 `characterApi` and wizard utilities.
- Produces: authenticated create route with identity, personality, review, confirmation, progress, recovery, and result states.

- [ ] **Step 1: Write failing wizard behavior tests**

```javascript
test('signed-out users are redirected before the wizard renders', async () => {
  auth.isLoggedIn.mockReturnValue(false);
  render(<CreateCharacterPage />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?intent=%2Fcharacters%2Fcreate'));
});

test('identity and personality advance to a free review quote', async () => {
  characterApi.quote.mockResolvedValue({
    slot_number: 1,
    credit_cost: 0,
    credits_before: 3,
    credits_after: 3,
    quote_version: 'q1',
  });
  renderSignedInWizard();
  chooseSurpriseForIdentity();
  clickContinue();
  chooseTrait('Kind');
  clickContinue();
  expect(await screen.findByText('Slot 1 of 30')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create Character' })).toBeEnabled();
});

test('paid create requires confirmation and submits once', async () => {
  characterApi.quote.mockResolvedValue(PAID_QUOTE);
  characterApi.createGeneration.mockResolvedValue({ id: 'job-1', status: 'accepted' });
  renderCompletedWizard();
  clickCreate();
  expect(screen.getByRole('dialog', { name: 'Create for 2 credits?' })).toBeInTheDocument();
  clickConfirm();
  await waitFor(() => expect(characterApi.createGeneration).toHaveBeenCalledTimes(1));
});

test('reload resumes a pending job without submitting another', async () => {
  loadPendingJob.mockReturnValue({ jobId: 'job-1', mode: 'create', startedAt: Date.now() });
  characterApi.generation.mockResolvedValue(COMPLETED_JOB);
  renderSignedInWizard();
  expect(await screen.findByText('Lumi')).toBeInTheDocument();
  expect(characterApi.createGeneration).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the page test and confirm the route is missing**

Run:

```bash
npm test -- --runInBand src/app/characters/create/page.test.js
```

Expected: import fails because the page and components do not exist.

- [ ] **Step 3: Implement identity and personality steps**

`CharacterWizard` owns:

```javascript
const [step, setStep] = useState('identity');
const [inputs, setInputs] = useState(INITIAL_CHARACTER_INPUTS);
const [quote, setQuote] = useState(null);
const [job, setJob] = useState(null);
const [result, setResult] = useState(null);
```

Use native labels, fieldsets, buttons, and error summaries. Surprise me must clear the corresponding explicit value, and selecting an explicit value must clear its Surprise flag.

- [ ] **Step 4: Implement Review, paid confirmation, and submission**

Fetch a fresh quote on entry to Review. The paid dialog repeats `credit_cost` and `credits_after`. Disable all submission controls after confirmation, create one idempotency key, persist the returned job ID, and treat `stale_quote`, `insufficient_credits`, and `no_slots` as Review-state errors.

- [ ] **Step 5: Implement progress polling and result**

Poll every two seconds while the page is visible. Stop on `completed` or `failed`. Result renders the saved portrait/profile with Done, Edit, and Delete; omit “Use in a story.”

- [ ] **Step 6: Add English and Hinglish copy**

Add keys for every heading, field, curated choice, error, quote, dialog, progress stage, and result action. Keep option values language-neutral and translate labels only.

- [ ] **Step 7: Add responsive Emberlight-aware styling**

Use existing CSS theme variables and card radii. Mobile uses one wizard card with a visible three-step progress indicator; desktop centers the same flow at a readable maximum width. Ensure the native bottom safe area remains clear.

- [ ] **Step 8: Run wizard, i18n, theme, and accessibility-focused tests**

Run:

```bash
npm test -- --runInBand src/app/characters/create/page.test.js src/utils/characterWizard.test.js src/utils/i18nProvider.test.js src/components/PremiumThemeCoverage.test.js
```

Expected: all tests pass.

- [ ] **Step 9: Commit the wizard**

```bash
git add src/components/characters src/app/characters/create src/utils/i18n.js
git commit -m "feat(characters): build generation wizard"
```

---

### Task 8: Character detail, edit, delete, and My Content shelf

**Files:**
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/components/characters/CharacterCard.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/app/characters/[id]/page.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/app/characters/[id]/page.module.css`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/app/characters/[id]/page.test.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/app/characters/[id]/edit/page.js`
- Modify: `dreamweaver-web/.worktrees/my-content-redesign/src/app/privacy/page.js`
- Create: `dreamweaver-web/.worktrees/my-content-redesign/src/app/privacy/characterPrivacy.test.js`
- Modify: `dreamweaver-web/.worktrees/my-content-redesign/src/app/my-stories/page.js`
- Modify: `dreamweaver-web/.worktrees/my-content-redesign/src/app/my-stories/page.module.css`
- Modify: `dreamweaver-web/.worktrees/my-content-redesign/src/app/my-stories/page.test.js`

**Interfaces:**
- Consumes: Task 6 `characterApi`; Task 7 wizard in create/edit mode.
- Produces: saved-character details and shelf ordering.

- [ ] **Step 1: Write failing detail and shelf tests**

```javascript
test('detail shows owner character with edit and delete', async () => {
  characterApi.get.mockResolvedValue(CHARACTER);
  render(<CharacterDetailPage params={{ id: 'c1' }} />);
  expect(await screen.findByRole('heading', { name: 'Lumi' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/characters/c1/edit');
  expect(screen.getByRole('button', { name: 'Delete Character' })).toBeInTheDocument();
});

test('delete confirmation removes character and returns to My Content', async () => {
  characterApi.remove.mockResolvedValue({ success: true });
  renderCharacterDetail();
  clickDelete();
  clickConfirmDelete();
  await waitFor(() => expect(characterApi.remove).toHaveBeenCalledWith('c1'));
  expect(replace).toHaveBeenCalledWith('/my-stories');
});

test('saved characters render before locked previews', async () => {
  characterApi.list.mockResolvedValue([CHARACTER]);
  render(<MyStoriesPage />);
  expect(await screen.findByRole('link', { name: /Lumi/ })).toBeInTheDocument();
  const shelf = screen.getByRole('region', { name: 'Characters' });
  expect(within(shelf).getAllByRole(/link|button/).map(node => node.textContent)).toEqual([
    expect.stringContaining('Create Character'),
    expect.stringContaining('Lumi'),
    expect.stringContaining('Moon Explorer'),
    expect.stringContaining('Dream Guardian'),
  ]);
});
```

- [ ] **Step 2: Run detail and My Content tests and confirm failures**

Run:

```bash
npm test -- --runInBand src/app/characters/[id]/page.test.js src/app/my-stories/page.test.js
```

Expected: detail route is missing and My Content does not request saved characters.

- [ ] **Step 3: Implement reusable saved CharacterCard**

Render `portrait_url`, name, type, and up to two traits in a shelf-sized link to `/characters/{id}`. Preserve fixed card dimensions and use an empty decorative alt only when the accessible link name already includes the character name.

- [ ] **Step 4: Implement details and delete**

Require sign-in, fetch by ID, show safe not-found/forbidden errors, and require a confirmation dialog before delete. On success, invalidate the character list and route to My Content.

- [ ] **Step 5: Implement edit mode**

The edit route loads the current character, maps it to wizard inputs, labels Review as an edit, always shows a 2-credit quote, submits through `characterApi.editGeneration`, and leaves the old detail visible if generation fails.

- [ ] **Step 6: Integrate My Content**

Replace the Character coming-soon activation:

```javascript
<CreationCard
  icon="＋"
  label={t('myCreateCharacter')}
  statusLabel={t('myAvailableNow')}
  onActivate={() => router.push('/characters/create')}
/>
{characters.map((character) => (
  <CharacterCard key={character.id} character={character} />
))}
{LOCKED_PREVIEWS.characters.map((preview) => (
  <LockedPreviewCard
    key={preview.id}
    label={t(preview.labelKey)}
    image={preview.image}
    onActivate={(event) => openComingSoon('character', event)}
  />
))}
```

Load characters only for authenticated users. A failed character request leaves the existing Favorites and Voices shelves usable.

- [ ] **Step 7: Update the privacy disclosure**

State that character names, descriptions, generated profiles, and portraits are stored with the account and sent to contracted AI generation providers solely to provide the requested feature. State that reference images are not collected and deletion removes the active record while queued media cleanup removes its portrait.

Add a focused test that requires those disclosures to remain present.

- [ ] **Step 8: Run detail, shelf, wizard, privacy, and existing My Content tests**

Run:

```bash
npm test -- --runInBand \
  'src/app/characters/[id]/page.test.js' \
  src/app/characters/create/page.test.js \
  src/app/privacy/characterPrivacy.test.js \
  src/app/my-stories/page.test.js \
  src/app/my-stories/MyStoriesPage.test.js \
  src/components/my-content/MyContentComponents.test.js
```

Expected: all tests pass.

- [ ] **Step 9: Commit character management and shelf integration**

```bash
git add src/components/characters/CharacterCard.js src/app/characters src/app/privacy src/app/my-stories
git commit -m "feat(characters): manage saved characters"
```

---

### Task 9: Full verification and guarded production deployment

**Files:**
- No tracked feature files change in this task.
- Production PM2 gains the `dreamweaver-character-worker` process.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified production API, worker, media, web routes, and My Content integration.

- [ ] **Step 1: Run the complete backend character and regression suite**

Run:

```bash
cd "/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-backend/.worktrees/my-content-credits"
python3 -m pytest \
  scripts/test_character_credit_reservations.py \
  scripts/test_character_repository.py \
  scripts/test_character_api.py \
  scripts/test_character_generator.py \
  scripts/test_character_worker.py \
  scripts/test_monthly_credits.py \
  scripts/test_subscription_credit_contract.py \
  scripts/test_save_offline_entitlements.py \
  scripts/test_deploy_guard_regression_contracts.py -q
```

Expected: all tests pass.

- [ ] **Step 2: Run the complete web suite, theme audit, and production build**

Run:

```bash
cd "/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-web/.worktrees/my-content-redesign"
npm test -- --runInBand
npm run verify:emberlight
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 3: Capture Deploy Guard snapshot**

Run from the backend worktree:

```bash
python3 scripts/deploy_guard.py snapshot
```

Expected: snapshot and JSON backup complete before production mutation.

- [ ] **Step 4: Push verified backend and web commits**

Push only after reviewing each repository’s exact commit range and confirming the three unrelated backend data files remain outside feature commits:

```bash
git -C "/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-backend/.worktrees/my-content-credits" status --short
git -C "/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-web/.worktrees/my-content-redesign" status --short
```

Push the approved heads to their production main branches without force.

- [ ] **Step 5: Deploy backend API and worker**

On `dreamvalley-prod` in `asia-south1-c`:

```bash
cd /opt/dreamweaver-backend
git fetch origin main
git checkout origin/main -- \
  app/dependencies.py \
  app/utils/credits.py \
  app/api/v1/subscriptions.py \
  app/api/v1/characters.py \
  app/api/v1/router.py \
  app/schemas/character_schema.py \
  app/services/characters \
  app/config.py \
  app/main.py \
  scripts/run_character_worker.py
sudo install -d -o anmolmohan -g anmolmohan /opt/character-media
```

Set `CHARACTER_MEDIA_DIR=/opt/character-media` and `PUBLIC_API_BASE_URL=https://api.dreamvalley.app` in the existing backend environment. Restart the existing backend process, then create or restart:

```bash
if sudo pm2 describe dreamweaver-character-worker >/dev/null 2>&1; then
  sudo pm2 restart dreamweaver-character-worker --update-env
else
  sudo pm2 start scripts/run_character_worker.py \
    --name dreamweaver-character-worker \
    --interpreter python3 \
    --cwd /opt/dreamweaver-backend
fi
sudo pm2 save
```

Require backend health, authenticated API 401 behavior without a token, worker `online`, and writable media directory before web deployment.

- [ ] **Step 6: Deploy the scoped web runtime**

On the same VM:

```bash
cd /opt/dreamweaver-web
git fetch origin main
git checkout origin/main -- \
  src/utils/api.js \
  src/utils/characterWizard.js \
  src/utils/i18n.js \
  src/components/characters \
  src/app/characters \
  src/app/my-stories/page.js \
  src/app/my-stories/page.module.css
```

Stop the root-owned web process during the build to prevent `.next` ownership races, rebuild, copy `public` and `.next/static` into the standalone bundle, restart `dreamweaver-web`, save PM2 state, and require HTTP 200 from `/my-stories` and `/characters/create`.

- [ ] **Step 7: Run production character smoke tests**

Using a user-authorized signed-in QA account with at least 4 spendable credits:

```text
1. Confirm signed-out /characters/create redirects to login.
2. Create into a free slot and verify no credit change.
3. Create into a paid slot after confirmation and verify exactly 2 credits are deducted after success.
4. Edit a slot-1 character and verify exactly 2 credits are deducted after success.
5. Delete a character and verify its exact slot becomes available.
6. Refresh during generation and verify the same job resumes.
7. Confirm saved characters precede locked previews in My Content.
8. Confirm portrait URLs use api.dreamvalley.app and return HTTP 200.
```

Delete the production smoke-test characters. The QA account is expected to retain the 4-credit spend from the paid create and edit checks; do not alter its balance outside the normal credit rules.

- [ ] **Step 8: Run Deploy Guard verification**

Run on production:

```bash
cd /opt/dreamweaver-backend
python3 scripts/deploy_guard.py verify
```

Expected: application, content, media, playlist, frontend, theme, routing, backup, paywall, and character checks pass. If YouTube remains offline, preserve all successful application checks and report the external broadcast session as the sole blocker without weakening Deploy Guard.
