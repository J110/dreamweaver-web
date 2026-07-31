'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { characterApi } from '@/utils/api';
import {
  CHARACTER_GENDERS,
  CHARACTER_TRAITS,
  CHARACTER_TYPES,
  clearPendingJob,
  createIdempotencyKey,
  loadPendingJob,
  savePendingJob,
  validateIdentity,
  validatePersonality,
} from '@/utils/characterWizard';
import { useI18n } from '@/utils/i18n';
import GenerationProgress from './GenerationProgress';
import PaidGenerationDialog from './PaidGenerationDialog';

const INITIAL_CHARACTER_INPUTS = {
  name: '',
  surpriseName: false,
  characterType: '',
  surpriseType: false,
  gender: 'not_specified',
  surpriseGender: false,
  traits: [],
  customDescription: '',
};

const SURPRISE_NAMES = {
  en: ['Lumi', 'Nova', 'Milo', 'Willow'],
  hi: ['चंदा', 'तारा', 'मिट्ठू', 'गुल'],
};

const optionLabel = (value, prefix, t) => t(`${prefix}${value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join('')}`);

const knownError = (message, t) => {
  if (/stale_quote/.test(message)) return t('characterErrorStaleQuote');
  if (/insufficient_credits/.test(message)) return t('characterErrorInsufficientCredits');
  if (/no_slots/.test(message)) return t('characterErrorNoSlots');
  return t('characterSubmitFailed');
};

const localizeErrors = (errors, t) => Object.fromEntries(Object.entries(errors).map(([field, error]) => {
  const keys = {
    'Enter a valid name or choose Surprise me': 'characterValidationNameRequired',
    'Keep names under 40 characters': 'characterValidationNameLength',
    'Choose a valid type or Surprise me': 'characterValidationType',
    'Choose a valid gender or Surprise me': 'characterValidationGender',
    'Choose valid traits': 'characterValidationTraits',
    'Choose up to 5 traits': 'characterValidationTraitsLength',
    'Enter details as text': 'characterValidationDetails',
    'Keep details under 300 characters': 'characterValidationDetailsLength',
  };
  return [field, t(keys[error] || 'characterSubmitFailed')];
}));

const quoteForMode = (quote, mode) => mode === 'edit'
  ? { ...quote, credit_cost: 2, credits_after: Math.max(0, quote.credits_before - 2) }
  : quote;

const differentValue = (values, current) => values.find((value) => value !== current) || values[0];

export default function CharacterWizard({ uid, mode = 'create', targetCharacterId = null, initialInputs, onDone, onEdit, onDelete, onResult }) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState('identity');
  const [inputs, setInputs] = useState(() => ({ ...INITIAL_CHARACTER_INPUTS, ...initialInputs }));
  const [quote, setQuote] = useState(null);
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [resultCharacterId, setResultCharacterId] = useState(null);
  const [retryResultLoad, setRetryResultLoad] = useState(false);
  const [connectionInterrupted, setConnectionInterrupted] = useState(false);
  const [failureCode, setFailureCode] = useState(null);
  const [errors, setErrors] = useState({});
  const [reviewError, setReviewError] = useState('');
  const [showPaidDialog, setShowPaidDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(null);

  useEffect(() => {
    const pending = loadPendingJob(uid);
    if (pending && pending.mode === mode && pending.targetCharacterId === targetCharacterId) {
      setJob({ id: pending.jobId, status: 'accepted' });
      setStep('generating');
    }
  }, [mode, targetCharacterId, uid]);

  const updateInput = (field, value) => setInputs((current) => ({ ...current, [field]: value }));

  const surprise = (valueField, surpriseField, values) => {
    setInputs((current) => ({
      ...current,
      [valueField]: differentValue(values, current[valueField]),
      [surpriseField]: false,
    }));
  };

  const continueIdentity = () => {
    const nextErrors = validateIdentity(inputs);
    setErrors(localizeErrors(nextErrors, t));
    if (!Object.keys(nextErrors).length) setStep('personality');
  };

  const continuePersonality = async () => {
    const nextErrors = validatePersonality(inputs);
    setErrors(localizeErrors(nextErrors, t));
    if (Object.keys(nextErrors).length) return;
    try {
      setReviewError('');
      const nextQuote = await characterApi.quote(mode, targetCharacterId);
      setQuote(quoteForMode(nextQuote, mode));
      setStep('review');
    } catch {
      setReviewError(t('characterQuoteFailed'));
    }
  };

  const submit = async () => {
    if (!quote || submitting) return;
    setSubmitting(true);
    try {
      idempotencyKey.current = createIdempotencyKey(idempotencyKey.current);
      const body = {
        inputs: {
          name: inputs.name,
          character_type: inputs.characterType,
          gender: inputs.gender,
          surprise_name: inputs.surpriseName,
          surprise_type: inputs.surpriseType,
          surprise_gender: inputs.surpriseGender,
          traits: inputs.traits,
          custom_description: inputs.customDescription || null,
        },
        quote_version: quote.quote_version,
        idempotency_key: idempotencyKey.current,
      };
      const nextJob = mode === 'edit'
        ? await characterApi.editGeneration(targetCharacterId, body)
        : await characterApi.createGeneration(body);
      savePendingJob(uid, {
        jobId: nextJob.id,
        mode,
        targetCharacterId,
        startedAt: Date.now(),
      });
      setJob(nextJob);
      setShowPaidDialog(false);
      setStep('generating');
    } catch (error) {
      const message = String(error?.message || '');
      if (/stale_quote/.test(message)) {
        setShowPaidDialog(false);
        try {
          setQuote(quoteForMode(await characterApi.quote(mode, targetCharacterId), mode));
          setReviewError(knownError(message, t));
          setStep('review');
        } catch {
          setReviewError(t('characterQuoteFailed'));
        }
      } else if (/insufficient_credits|no_slots/.test(message)) {
        setReviewError(knownError(message, t));
        setShowPaidDialog(false);
      } else {
        setReviewError(t('characterSubmitFailed'));
      }
      setSubmitting(false);
    }
  };

  const failed = useCallback((currentJob) => {
    clearPendingJob(uid);
    idempotencyKey.current = null;
    setJob(null);
    setSubmitting(false);
    setRetryResultLoad(false);
    setConnectionInterrupted(false);
    setFailureCode(currentJob?.error_code || null);
    setStep('failed');
  }, [uid]);

  const completed = useCallback(async (completedJob) => {
    if (!completedJob.character_id) {
      failed();
      return;
    }
    try {
      setJob(completedJob);
      const character = await characterApi.get(completedJob.character_id);
      clearPendingJob(uid);
      setResultCharacterId(completedJob.character_id);
      onResult?.(character);
      setRetryResultLoad(false);
      setResult(character);
      setStep('result');
    } catch {
      setSubmitting(false);
      setRetryResultLoad(true);
      setStep('failed');
    }
  }, [failed, onResult, uid]);

  const transportFailed = useCallback(() => {
    setSubmitting(false);
    setConnectionInterrupted(true);
    setStep('connection');
  }, []);

  const retry = async () => {
    setSubmitting(false);
    setReviewError('');
    setFailureCode(null);
    if (retryResultLoad && job?.status === 'completed') {
      setStep('generating');
      return;
    }
    try {
      setQuote(quoteForMode(await characterApi.quote(mode, targetCharacterId), mode));
      setStep('review');
    } catch {
      setReviewError(t('characterQuoteFailed'));
      setStep('personality');
    }
  };

  const deleteResult = async () => {
    const characterId = resultCharacterId || result?.id;
    if (!characterId || !window.confirm(t('characterDeleteConfirm'))) return;
    try {
      await characterApi.remove(characterId);
      (onDelete || onDone)?.();
    } catch {
      setReviewError(t('characterDeleteFailed'));
    }
  };

  const toggleTrait = (trait) => {
    setInputs((current) => ({
      ...current,
      traits: current.traits.includes(trait)
        ? current.traits.filter((item) => item !== trait)
        : current.traits.length < 5 ? [...current.traits, trait] : current.traits,
    }));
  };

  if (step === 'generating' && job) {
    return <GenerationProgress job={job} onCompleted={completed} onFailed={failed} onTransportError={transportFailed} label={t('characterGenerating')} />;
  }

  if (step === 'result' && result) {
    const profile = result.profile || result;
    return (
      <section className="characterResult">
        {result.portrait_url && <img src={result.portrait_url} alt="" />}
        <h1>{profile.name}</h1>
        <p>{profile.profile_summary}</p>
        {reviewError && <p role="alert">{reviewError}</p>}
        <button type="button" onClick={onDone}>{t('characterDone')}</button>
        <button type="button" onClick={() => onEdit?.(resultCharacterId || result.id)}>{t('characterEdit')}</button>
        <button type="button" onClick={deleteResult}>{t('characterDelete')}</button>
      </section>
    );
  }

  if (step === 'failed') {
    const unsafeInput = failureCode === 'unsafe_input';
    return (
      <section className="characterFailure" aria-live="polite">
        <p>{unsafeInput ? t('characterErrorUnsafeInput') : t('characterFailed')}</p>
        {unsafeInput && <button type="button" onClick={() => { setFailureCode(null); setStep('identity'); }}>{t('characterEditDetails')}</button>}
        <button type="button" onClick={retry}>{t('characterRetry')}</button>
      </section>
    );
  }

  if (step === 'connection' && job && connectionInterrupted) {
    return <section className="characterFailure" aria-live="polite"><p>{t('characterConnectionFailed')}</p><button type="button" onClick={() => { setConnectionInterrupted(false); setStep('generating'); }}>{t('characterRetry')}</button></section>;
  }

  const wizardSteps = [
    { id: 'identity', label: t('characterIdentity') },
    { id: 'personality', label: t('characterPersonality') },
    { id: 'review', label: t(mode === 'edit' ? 'characterEditReview' : 'characterReview') },
  ];
  const currentStepIndex = wizardSteps.findIndex((item) => item.id === step);

  return (
    <section className="characterWizard">
      <h1>{t(mode === 'edit' ? 'characterEditTitle' : 'characterTitle')}</h1>
      <ol aria-label={t('characterSteps')}>
        {wizardSteps.map((item, index) => {
          const stepState = index < currentStepIndex
            ? 'completed'
            : index === currentStepIndex
              ? 'current'
              : 'upcoming';
          return (
            <li
              key={item.id}
              data-step-state={stepState}
              aria-current={stepState === 'current' ? 'step' : undefined}
            >
              <span className="characterStepNumber">{index + 1}</span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
      {step === 'identity' && <>
        <fieldset><legend>{t('characterIdentity')}</legend>
          <label>{t('characterName')}<input value={inputs.name} onChange={(event) => setInputs((current) => ({ ...current, name: event.target.value, surpriseName: false }))} /></label>
          <button type="button" onClick={() => surprise('name', 'surpriseName', SURPRISE_NAMES[lang] || SURPRISE_NAMES.en)}>{t('characterSurpriseName')}</button>
          <label>{t('characterType')}<select value={inputs.characterType} onChange={(event) => setInputs((current) => ({ ...current, characterType: event.target.value, surpriseType: false }))}><option value="">{t('characterChoose')}</option>{CHARACTER_TYPES.map((type) => <option key={type} value={type}>{optionLabel(type, 'characterType', t)}</option>)}</select></label>
          <button type="button" onClick={() => surprise('characterType', 'surpriseType', CHARACTER_TYPES)}>{t('characterSurpriseType')}</button>
          <label>{t('characterGender')}<select value={inputs.gender} onChange={(event) => setInputs((current) => ({ ...current, gender: event.target.value, surpriseGender: false }))}>{CHARACTER_GENDERS.map((gender) => <option key={gender} value={gender}>{optionLabel(gender, 'characterGender', t)}</option>)}</select></label>
          <button type="button" onClick={() => surprise('gender', 'surpriseGender', CHARACTER_GENDERS)}>{t('characterSurpriseGender')}</button>
        </fieldset>
        {Object.values(errors).map((error) => <p key={error} role="alert">{error}</p>)}
        <button type="button" onClick={continueIdentity}>{t('characterContinue')}</button>
      </>}
      {step === 'personality' && <>
        <fieldset><legend>{t('characterTraits')}</legend>{CHARACTER_TRAITS.map((trait) => <button type="button" key={trait} aria-pressed={inputs.traits.includes(trait)} onClick={() => toggleTrait(trait)}>{optionLabel(trait, 'characterTrait', t)}</button>)}</fieldset>
        <label>{t('characterDetails')}<textarea value={inputs.customDescription} onChange={(event) => updateInput('customDescription', event.target.value)} /></label>
        {Object.values(errors).map((error) => <p key={error} role="alert">{error}</p>)}
        {reviewError && <p className="characterError" role="alert">{reviewError}</p>}
        <button type="button" onClick={() => setStep('identity')}>{t('characterBack')}</button>
        <button type="button" onClick={continuePersonality}>{t('characterContinue')}</button>
      </>}
      {step === 'review' && quote && <>
        <div className="characterReview">
          <section className="characterReviewSection">
            <h2>{t('characterIdentity')}</h2>
            <dl>
              <dt>{t('characterName')}</dt><dd>{inputs.name || t('characterNone')}</dd>
              <dt>{t('characterType')}</dt><dd>{inputs.characterType ? optionLabel(inputs.characterType, 'characterType', t) : t('characterNone')}</dd>
              <dt>{t('characterGender')}</dt><dd>{inputs.gender ? optionLabel(inputs.gender, 'characterGender', t) : t('characterNone')}</dd>
            </dl>
          </section>
          <section className="characterReviewSection">
            <h2>{t('characterPersonality')}</h2>
            <dl>
              <dt>{t('characterTraits')}</dt><dd>{inputs.traits.length ? inputs.traits.map((trait) => optionLabel(trait, 'characterTrait', t)).join(', ') : t('characterNone')}</dd>
              <dt>{t('characterDetails')}</dt><dd>{inputs.customDescription || t('characterNone')}</dd>
            </dl>
          </section>
          <section className="characterReviewSection">
            <h2>{t('characterGeneration')}</h2>
            <dl>
              <dt>{t('characterSlot')} </dt><dd>{quote.slot_number} {t('characterOf')} 30</dd>
              <dt>{t('characterCost')}</dt><dd>{quote.credit_cost === 0 ? t('characterFree') : `${quote.credit_cost} ${t('characterCredits')}`}</dd>
              <dt>{t('characterCurrentCredits')}</dt><dd>{quote.credits_before}</dd>
              <dt>{t('characterCreditsAfter')}</dt><dd>{quote.credits_after}</dd>
            </dl>
          </section>
        </div>
        {reviewError && <p role="alert">{reviewError}</p>}
        <button type="button" onClick={() => setStep('personality')} disabled={submitting}>{t('characterBack')}</button>
        <button type="button" onClick={() => quote.credit_cost > 0 ? setShowPaidDialog(true) : submit()} disabled={submitting}>{t('characterCreate')}</button>
        {showPaidDialog && <PaidGenerationDialog quote={quote} onConfirm={submit} onCancel={() => setShowPaidDialog(false)} confirming={submitting} title={t('characterPaidTitle')} body={t('characterPaidBody')} confirmLabel={t('characterConfirm')} cancelLabel={t('characterCancel')} />}
      </>}
    </section>
  );
}
