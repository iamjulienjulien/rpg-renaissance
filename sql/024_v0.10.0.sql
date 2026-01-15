
/* ============================================================================
🏆 ACHIEVEMENT: FIRST PHOTO
============================================================================ */

insert into public.achievement_catalog (
    code,
    name,
    description,
    icon,
    scope,
    is_repeatable,
    cooldown_hours,
    trigger_event,
    conditions,
    rewards,
    is_active
) values (
    'first_photo',
    'Première photo',
    'Tu as ajouté ta toute première photo.',
    '📸',
    'user',
    false,
    null,
    'photo_uploaded',
    jsonb_build_object(
        'operator', 'AND',
        'rules', jsonb_build_array(
            jsonb_build_object(
                'type', 'photo_uploaded',
                'scope', 'global',
                'value', 1
            )
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'type', 'badge',
            'code', 'first_photo'
        )
    ),
    true
)
on conflict (code) do nothing;


/* ============================================================================
🏅 BADGE: FIRST PHOTO
============================================================================ */

insert into public.achievement_badges_catalog (
    code,
    title,
    emoji,
    description
) values (
    'first_photo',
    'Première photo',
    '📸',
    'Première photo ajoutée dans ton aventure.'
)
on conflict (code) do nothing;