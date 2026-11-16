# @xavisoft/joi

[Joi](https://joi.dev) with two additions, built on [`libphonenumber-js`](https://gitlab.com/catamphetamine/libphonenumber-js) for phone handling:

- **`Joi.string().phone()`**: strict phone number validation and normalization to E.164, using libphonenumber's full (`max`) metadata.
- **`Joi.getError()` / `Joi.check()`**: one-line validation helpers for request handlers.

Everything else is plain Joi, so existing schemas keep working.

## Installation

```bash
npm install @xavisoft/joi
```

## Quick start

```js
const Joi = require('@xavisoft/joi');

const schema = {
	name: Joi.string().required(),
	phone: Joi.string().phone({ defaultCountry: 'ZW' }).required(),
};

const { error, value } = Joi.check(req.body, schema);
if (error)
	return res.status(400).send(error);

// value.phone is E.164, e.g. "+263771234567"
```

## `Joi.string().phone([options])`

Validates that the value is a real phone number (not just something that looks like one) and converts it to E.164 format (`+263771234567`), which is the format you want in a database.

Validation uses `isValid()` against libphonenumber's full per-country metadata. Numbers that are merely the right length, or that parse into a nonexistent number, are rejected.

### Options

| Option             | Type       | Description |
| ------------------ | ---------- | ----------- |
| `defaultCountry`   | `string`   | ISO 3166-1 alpha-2 code (uppercase, e.g. `'ZW'`). Decides which country a number written **without** a country code belongs to. It is not a restriction: numbers from other countries are still accepted if they include a country code. |
| `allowedCountries` | `string[]` | Restricts accepted numbers to these countries. Omit to accept any country. |

Both are optional. Invalid options throw when the schema is defined, not when a request arrives.

### Examples

```js
// Any valid number. A country code is required.
Joi.string().phone()
//   "+263771234567"  ok
//   "+44 7911 123456" ok
//   "0771234567"     rejected (which country?)

// Local numbers are read as Zimbabwean. Other countries still accepted.
Joi.string().phone({ defaultCountry: 'ZW' })
//   "0771234567"      -> "+263771234567"
//   "771234567"       -> "+263771234567"
//   "+44 7911 123456" -> "+447911123456"

// Only these countries. A country code is required.
Joi.string().phone({ allowedCountries: ['ZW', 'ZA'] })

// Only these countries, with local numbers read as Zimbabwean.
Joi.string().phone({ defaultCountry: 'ZW', allowedCountries: ['ZW', 'ZA'] })
```

### How `defaultCountry` and `allowedCountries` interact

- `defaultCountry` is always accepted when `allowedCountries` is set. `{ defaultCountry: 'ZW', allowedCountries: ['GB'] }` accepts both ZW and GB numbers.
- `allowedCountries` on its own does not tell the parser how to read local numbers. `{ allowedCountries: ['ZW'] }` therefore still requires `+263`. To accept local Zimbabwean numbers, also set `defaultCountry: 'ZW'`.
- Numbers that don't belong to a single country (some shared calling codes and non-geographic numbers) are rejected whenever `allowedCountries` is set.

### Normalization

On success, the rule replaces the value with the E.164 string. Surrounding whitespace is trimmed, and spaces, dashes and brackets inside the number are removed.

```js
Joi.string().phone({ defaultCountry: 'ZW' }).validate(' 077 123 4567 ').value
// "+263771234567"
```

Normalization is idempotent: validating an already-normalized number returns the same string.

### Error message

```
"phone" must be a valid phone number
```

The same message is used for unparseable numbers, invalid numbers and numbers from a country that isn't allowed.

## `Joi.getError(data, schema)`

Returns the first validation error message as a string, or `null` if the data is valid. `schema` can be a Joi schema or a plain object of keys (which is wrapped in `Joi.object()`).

```js
const error = Joi.getError(req.body, schema);
if (error)
	return res.status(400).send(error);
```

`getError` only reports errors. It does not return the validated value, so values converted by the schema (including normalized phone numbers) are not available from it. Use `Joi.check` when you need them.

## `Joi.check(data, schema)`

Same as `getError`, but also returns the validated and converted value.

```js
const { error, value } = Joi.check(req.body, schema);
if (error)
	return res.status(400).send(error);

await db.users.insert({ phone: value.phone }); // E.164
```

Returns `{ error: string | null, value }`.

## Notes

- Requires Joi 17.
- CommonJS (`require`) only.
- Phone validation checks that a number is valid under the numbering plan of its country. It cannot tell you whether the number is actually assigned to someone, so use SMS or WhatsApp verification if you need that.