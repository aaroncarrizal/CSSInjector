---
name: create-custom-form
description: Use when the user wants to create a new custom IRV form, add new fields to an existing form, or generate custom form input elements for the ICC platform. Covers copying default forms, naming conventions (jem/jnl/eml prefixes), and custom input markup.
---

# Create Custom IRV Forms

Guide for adding fields to an existing form or building new custom form inputs in the ICC platform (InteractRV Forms). Modeled on the FED knowledge-base article "Add New Fields to an Existing Form".

## Key Rules

- **PDF exports** (employment applications, credit applications) are NOT handled by this workflow. Escalate those to FED.
- All custom input element names must follow the naming convention below.
- Forms edited via the **source code** editor in ICC (Websites > Content).
- The submit control MUST be `<input type="submit" value="..." class="btn btn-primary" />` — NOT `<button type="submit">`. ICC's scripts (`jquery.supplemental.js` `reCaptchaInit` + `irvform.js`) locate the submit button via `form.find('input[type="submit"]')` to: inject the `.recaptcha-container` div before it, disable it until reCAPTCHA passes, and bind the AJAX submit to `/Forms/Ajax.aspx`. A `<button>` matches none of that → no reCAPTCHA widget renders → server rejects with "Form did not pass the recaptcha check."

## Copy an Existing Default Form

Use this when you need a default IRV form plus additional fields — copy the default and move it to the dealer's Forms folder.

1. In ICC, use the account hop feature to switch to the **InteractRV** account.
2. In **Websites > Content** view, open the **StandardForms** folder. Find a form that contains an input you want to copy. Right-click the form → **Copy**.
3. Copy the form to the **forms folder of the target dealer's account**.
4. Switch your account to the **dealer** whose site you're editing.
5. Navigate to the dealer's forms folder, click the copied form, and append the **Dealer Name** to the copied form's name. **Save and Publish**.
6. To edit the form content, click the **source code** button to open the code editor. Edit as needed, then **Save and Publish**.

## Default Inputs vs Custom Inputs

There are two types of form inputs:

### Default Inputs
Name values are exactly one of:
- `FirstName`
- `Email`
- `Phone`
- `Zip`
- `Comments`
- `EmailOptIn`

### Custom Inputs
Name values start with one of three prefixes:

| Prefix | Destination |
|--------|-------------|
| `eml` | Included in the **email** |
| `jnl` | Included in the **journal** |
| `jem` | Included in the **email AND journal** (most common) |

Format rules:
- Prefix must be followed by an underscore, then a word/words describing the input category.
- A section may optionally be added **in brackets** right after the prefix: `jem[CurrentRV]_`. Inputs sharing the same section group into their own section in the ICC journal and in dealer emails.

Examples:
```
jem[CurrentRV]_Year
jem_Preferred_RV_Brand
jem[Current_RV_Options]_DVDPlayer
```

## Copying a Form Input Element (between forms)

1. Navigate to the dealer's forms folder, open the source form, click **source code**.
2. Find the input to copy, highlight the whole input element (including its wrapping `div`), and copy it.
3. Open the destination form, click **source code**, paste the input at the desired location. **Save and Publish**.

## Creating a Custom Form Input

1. Pick an input type and copy/paste/modify an example from below (inside the form's source code).
2. When pasting, always build the markup so the name reflects the input (e.g. an RV brand question → `jem_Brand` or similar) and follow the naming convention.
3. **Save and Publish** when finished.

## Custom Input Element Examples

Replace `[SECTION_NAME]` and `Input_Category`/`Option` values as needed. Keep the Bootstrap structure: `.form-group` wrapper, `label` + `.col-sm-X` layout, form control inside `.col-sm-5` / `.col-sm-7`.

### Text Input
```html
<div class="form-group">
  <label for="jem[SECTION_NAME]_Input_Category" class="col-sm-7 control-label text-left">Your Label</label>
  <div class="col-sm-5">
    <input name="jem[SECTION_NAME]_Input_Category" id="jem[SECTION_NAME]_Input_Category" class="form-control" />
  </div>
</div>
```

### Select Input
```html
<div class="form-group">
  <label for="jem[SECTION_NAME]_Input_Category" class="col-sm-7 control-label text-left">Your Label</label>
  <div class="col-sm-5">
    <select name="jem[SECTION_NAME]_Input_Category" id="jem[SECTION_NAME]_Input_Category" class="form-control">
      <option value="None Chosen">Choose</option>
      <option>1</option>
      <option>2</option>
      <option>3</option>
    </select>
  </div>
</div>
```

### Radio Button Input
```html
<div class="form-group">
  <label class="col-sm-5 control-label text-left">Did you buy it New or Used?</label>
  <div class="col-sm-7">
    <label class="radio-inline"><input type="radio" name="jem[SECTION_NAME]_Input_Category" value="New" /> New</label>
    <label class="radio-inline"><input type="radio" name="jem[SECTION_NAME]_Input_Category" value="Used" /> Used</label>
  </div>
</div>
```

### Checkbox Input
```html
<div class="form-group">
  <div><input type="checkbox" id="jem[Current_RV_Options]_DVDPlayer" name="jem[Current_RV_Options]_DVDPlayer" /> DVD Player</div>
  <div><input type="checkbox" id="jem[Current_RV_Options]_TV" name="jem[Current_RV_Options]_TV" /> TV</div>
  <div><input type="checkbox" id="jem[Current_RV_Options]_SatelliteRadio" name="jem[Current_RV_Options]_SatelliteRadio" /> Satellite Radio</div>
</div>
```

## Form Configuration Fields

**Note: this page/section is still under construction. This is not yet an exhaustive list.**

Form behaviors are largely controlled by **hidden input elements at the bottom of the form markup**. The text in **bold** below is used as the `name` value in the hidden input. These input names are **case specific** (use exactly as written).

```html
<p>
  <input name="FormType" value="Contact Us" type="hidden" />
  <input name="RedirectUrl" id="RedirectUrl" value="/contact-confirmation" type="hidden" />
</p>
```

### Required on All Forms

- **FormType** - Sets the form type shown in the ICC inbox.
  ```html
  <input name="FormType" value="FORM TYPE VALUE GOES HERE" type="hidden" />
  ```
- **AjaxTarget** - The URL the form posts to via AJAX. Must be on **every** form. **Do not edit the field name.** Use the working endpoint `/Forms/Ajax` (NOT `/Forms/Ajax.aspx` — that variant 404s and the AJAX submit dies with a generic `An error occurred during form submission. Type: error` alert). The source guide mentions `/Forms/Ajax.aspx`, but the live handler on current sites is `/Forms/Ajax`, and ICC's own utility code (`ProcessPSMCallbackInfo`) posts to `/Forms/Ajax`. Verified against a live submit: `/Forms/Ajax` → 200 JSON `{success, friendlyCustomErrorMsg}`; `/Forms/Ajax.aspx` → 404.
  ```html
  <input name="AjaxTarget" value="/Forms/Ajax" type="hidden" />
  ```

### Redirect Settings

- **RedirectUrl** - The user is redirected to this URL after the form submission completes.
  ```html
  <input name="RedirectUrl" id="RedirectUrl" value="/contact-confirmation" type="hidden" />
  ```

### Email Settings

- **AccountOverRideEmail** - If set, the lead notification email is sent to this address regardless of lead distribution settings and assigned salesperson. Accepts multiple email addresses as comma-delimited values (only the first value is used as the "from" address).
  ```html
  <input type="hidden" name="AccountOverRideEmail" value="testingterry@testworld.com" />
  <input type="hidden" name="AccountOverRideEmail" value="testingterry@testworld.com,analytics@testworld.com" />
  ```

### Lead Registration / Templates (REQUIRED for inbox activity)

These fields are present on every working ICC form and control whether a submission actually registers as an activity in the dealer inbox/journal. A form that submits OK but never shows up in the Inbox is almost always missing these — copy the values from a known-good form on the same site (e.g. a Contact Us form):

- **JournalTemplate** - Handlebar template used to render the journal entry (`journal.hbs` on current sites). Without it the activity isn't journaled.
- **AccountEmailTemplate** - Template for the dealer notification email (`lead_generic.hbs` on current sites).
- **CustomerEmailTemplate** - Template for the customer confirmation email (e.g. `contact_confirmation.hbs`).
- **SuccessMessage** - Text shown/returned on success (e.g. `Request Sent Successfully`).

Reference (from a live, working Contact Us form):
```html
<input name="SuccessMessage" id="SuccessMessage" value="Request Sent Successfully" type="hidden" />
<input name="JournalTemplate" value="journal.hbs" type="hidden" />
<input name="AccountEmailTemplate" id="AccountEmailTemplate" value="lead_generic.hbs" type="hidden" />
<input name="CustomerEmailTemplate" id="CustomerEmailTemplate" value="contact_confirmation.hbs" type="hidden" />
```

### Submit Button Convention

The submit control is `<input type="submit" name="SubmitButton" id="SubmitButton" value="Submit" class="btn btn-primary" />`. Keep the `name/id="SubmitButton"` — working ICC forms include them and ICC scripts key off the `input[type="submit"]` selector.

### Form Anatomy (Contact Us reference)

A production ICC form shell (structure reference, fields abbreviated):

```html
<div class="well">
  <div class="row">
    <div class="col-md-6">
      <div class="form-group"><span class="field-validation-valid" data-valmsg-for="FirstName" data-valmsg-replace="true"></span></div>
      <div class="form-group"><span class="field-validation-valid" data-valmsg-for="Email" data-valmsg-replace="true"></span></div>
      <div class="form-group"><span class="field-validation-valid" data-valmsg-for="Phone" data-valmsg-replace="true"></span></div>
    </div>
    <div class="col-md-6">
      <div class="form-group"><label for="Comments">How can we help you?</label> <textarea name="Comments" id="Comments"></textarea></div>
    </div>
  </div>
  <div class="form-group">
    <div class="checkbox"><label for="EmailOptIn"><input name="EmailOptIn" id="EmailOptIn" type="checkbox" /> Email Opt In</label></div>
  </div>
  <div>
    <div class="pull-left"><em>*</em> Required</div>
    <div class="clearfix"></div>
  </div>
  <br />
  <div>
    <div class="pull-left"><input name="SubmitButton" id="SubmitButton" value="Submit" type="submit" /></div>
    <div class="clearfix"></div>
  </div>
  <p><input name="FormType" value="Contact Us" type="hidden" /> <input name="RedirectUrl" id="RedirectUrl" value="/contact-confirmation" type="hidden" /></p>
</div>
```

## Workflow for "create a new custom form" requests

When the user describes a form they want to build:

1. **Confirm scope**: Is this PDF-exportable (employment/credit)? If so, escalate to FED — do not build it here.
2. **Choose base**: Is there a default form close to what they need? If yes, walk the "Copy an Existing Default Form" steps.
3. **List the fields**: Enumerate each field as a custom input with a proposed `name` following the convention (`jem[Section]_Category` where a section grouping makes sense).
4. **Generate markup**: Produce the full source-code block from the examples above, with real labels and name values (no `[SECTION_NAME]` placeholders).
5. **Add Form Configuration Fields**: Include the hidden config inputs at the bottom of the form — `FormType`, `AjaxTarget` (`/Forms/Ajax.aspx`, never edit), and `RedirectUrl` (+ `AccountOverRideEmail` only when the lead email must bypass distribution settings). Placeholders like `FORM TYPE VALUE GOES HERE` must be replaced with real values, and `RedirectUrl` must be resolved to an actual confirmation page on the target site.
6. **Verify**: Check every input's name uses `jem`/`jnl`/`eml` prefix + underscore (or a default name), that label `for` matches input `id`, and that all hidden config field names are exact/case-sensitive.

## reCAPTCHA / ICC Form Pipeline (how a valid form submits)

When ICC renders a custom form it wraps your markup in `<form method="post" class="form irvForm" data-irvform-requires-recaptcha="true" ...>` and injects `FormToken`, a honeypot, and a validation cookie. On submit:

1. `jquery.supplemental.js` runs `reCaptchaLoad()` on `form[data-irvform-requires-recaptcha=true]`, which disables the submit button, then `reCaptchaInit()` inserts `<div class="recaptcha-container">` **immediately before the `input[type="submit"]`** and renders Google reCAPTCHA into it (widget id stored on `.recaptcha-container` data).
2. The widget writes its token into a `g-recaptcha-response` textarea inside the container; `irvform.js` serializes ALL `:input` and POSTs to the hidden `AjaxTarget` (`/Forms/Ajax.aspx`), then follows `RedirectUrl` / `ConfirmationId`.
3. The user never pastes the reCAPTCHA widget — ICC injects it. If no `.recaptcha-container` appears on the live page and forms fail with "Form did not pass the recaptcha check.", the form's submit control is a `<button>` instead of `input[type="submit"]`, or the reCAPTCHA script/images couldn't load (recaptcha site key is hardcoded in `jquery.supplemental.js`).