-- 002_seed_inventory_plants_v1.sql

--------------------------------------------------------------------------------
-- Seed: inventory_schema_versions (plants.v1)
--------------------------------------------------------------------------------

insert into public.inventory_schema_versions
(id, code, version, title, description, schema_json, is_active, created_at, updated_at)
values (
    '73129d86-dae4-4f85-b407-93812ca68486',
    'plants.v1',
    'v1',
    'Plantes (v1)',
    'Inventaire des plantes du foyer. Données structurées + ai_description.',
    '{
      "type": "object",
      "required": ["schema", "schema_version", "ai_description", "data"],
      "properties": {
        "data": {
          "type": "object",
          "required": ["name","common_name","species","location","light","watering","health","notes"],
          "properties": {
            "name": { "type": ["string","null"], "maxLength": 80 },
            "common_name": { "type": ["string","null"], "maxLength": 120 },
            "species": { "type": ["string","null"], "maxLength": 160 },
            "location": { "type": ["string","null"], "maxLength": 140 },
            "light": { "type": ["string","null"], "enum": ["low","medium","high", null] },
            "watering": { "type": ["string","null"], "enum": ["low","medium","high", null] },
            "health": { "type": ["string","null"], "enum": ["poor","ok","good", null] },
            "notes": { "type": ["string","null"], "maxLength": 700 }
          },
          "additionalProperties": false
        },
        "schema": { "type": "string", "const": "plants" },
        "ai_description": { "type": "string", "minLength": 1, "maxLength": 900 },
        "schema_version": { "type": "string", "const": "v1" }
      },
      "additionalProperties": false
    }'::jsonb,
    true,
    '2025-12-31 16:24:05.794313+00',
    '2025-12-31 16:45:01.688683+00'
)
on conflict (code) do update set
    version = excluded.version,
    title = excluded.title,
    description = excluded.description,
    schema_json = excluded.schema_json,
    is_active = excluded.is_active,
    updated_at = now();