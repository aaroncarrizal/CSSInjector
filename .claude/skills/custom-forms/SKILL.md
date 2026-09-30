---
name: custom-forms
description: Create or update a custom lead form (Contact Us, Parts Request, Get a Quote, Trade-In, etc.) on a dealer site. Use when the user asks to build a new form, add/change form fields, change where a form's leads are emailed, change the post-submit redirect or success message, or debug a form that isn't submitting or isn't showing up in the ICC inbox. Covers the hidden "Form Configuration Fields" (FormType, AjaxTarget, RedirectUrl, AccountOverRideEmail, SuccessMessage, email/journal templates), the standard contact fields, and custom `jem[...]` fields.
---

# Custom Forms

Sources: the internal "IRVFED – Form Configuration Fields" page (marked "still under construction" upstream, so it isn't a complete list of config fields) and the platform's default Contact Us and Parts Request forms.

**Always build from a working form**: one already on the same site, or default form markup the user provides. Don't retype field markup from memory: the validation attributes and regexes have to be exact.

Forms live in the CMS. This tool never edits the CMS. Build or change the markup, preview it live with `dbg replace` / `dbg inner`, then hand the user the final HTML to paste in. This is the **HTML** layer of Fix Priority in AGENTS.md.

## How forms are configured

A form's behavior is controlled by **hidden `<input>` elements at the bottom of the form markup**, grouped in a `<p>` after the Submit button. The backend reads each one by its `name`:

```html
<input name="FormType" value="Contact Us" type="hidden" />
```

- `name`: tells the backend what to do with this element. **Case-sensitive**: `FormType`, not `formtype`. Note the odd casing in `AccountOverRideEmail`.
- `value`: the setting itself (here, set the form type to "Contact Us").
- `type="hidden"`: keeps it invisible to users.

The `<p>` of config fields can sit inside the `.well` (Contact Us) or right after it (Parts Request). Both work, so keep whichever placement the form already uses.

## Configuration fields

### Required on every form

| name | Default value | Notes |
|---|---|---|
| `FormType` | `Contact Us` | The label that shows up in the ICC inbox. Give each form a distinct, descriptive value (e.g. `Parts Request`) so its leads can be told apart. |
| `AjaxTarget` | `/Forms/Ajax` | The URL the form posts to via AJAX. **Must be on every form. Do not edit it.** (The doc's prose says `/Forms/Ajax.aspx`, but its example and every default form use `/Forms/Ajax`.) |

### Standard fields on the default forms

Keep these as they are unless the user asks to change them. They're what the default forms ship with, but the config doc doesn't describe them, so don't guess at other values for them.

| name | Default value | What it does |
|---|---|---|
| `RedirectUrl` (also `id="RedirectUrl"`) | `/contact-confirmation` | Where the user is sent after the submission completes. Make sure the target page exists. |
| `SuccessMessage` (also `id`) | `Request Sent Successfully` | The success message text. |
| `JournalTemplate` | `journal.hbs` | The template used for the lead's journal entry. |
| `AccountEmailTemplate` (also `id`) | `lead_generic.hbs` | The template for the lead notification email sent to the dealer. |
| `CustomerEmailTemplate` (also `id`) | `contact_confirmation.hbs` | The template for the confirmation email sent to the customer. |

The default block, exactly as it ships:

```html
<p><input name="FormType" value="Contact Us" type="hidden" /> <input name="RedirectUrl" id="RedirectUrl" value="/contact-confirmation" type="hidden" /> <input name="AjaxTarget" value="/Forms/Ajax" type="hidden" /> <input name="SuccessMessage" id="SuccessMessage" value="Request Sent Successfully" type="hidden" /> <input name="JournalTemplate" value="journal.hbs" type="hidden" /> <input name="AccountEmailTemplate" id="AccountEmailTemplate" value="lead_generic.hbs" type="hidden" /> <input name="CustomerEmailTemplate" id="CustomerEmailTemplate" value="contact_confirmation.hbs" type="hidden" /></p>
```

### Email routing (optional)

| name | Value | Notes |
|---|---|---|
| `AccountOverRideEmail` | One address, or several comma-delimited | When set, the lead notification email goes to these addresses **regardless of lead-distribution settings and the assigned salesperson**. Only the **first** address is used as the "from" address. |

```html
<input type="hidden" name="AccountOverRideEmail" value="sales@dealer.com" />
<input type="hidden" name="AccountOverRideEmail" value="sales@dealer.com,manager@dealer.com" />
```

Only add `AccountOverRideEmail` when the user explicitly asks to route a form to specific addresses, because it bypasses the dealer's normal lead distribution. Add it inside the same config `<p>`. Confirm the addresses with the user and never guess them.

## Form fields

### Standard contact fields

Every default form has the same contact block: a `.row` with two `col-md-6` columns. The left column holds `FirstName` (full name, which must contain a space), `Email`, `Phone` and `Zip`, all required. The right column holds a `Comments` textarea, with its label changed per form ("How can we help you?", "Additional Comments"). Below the block are the `EmailOptIn` checkbox (checked by default) and the `SubmitButton`.

A required field looks like this. Copy all of its parts:

```html
<div class="form-group"><span class="field-validation-valid" data-valmsg-for="Email" data-valmsg-replace="true"></span><i class="fa fa-exclamation-triangle"></i><label for="Email">Email <em>*</em></label> <input name="Email" id="Email" class="form-control" data-val="true" data-val-required="Email is required." data-val-regex="Please enter a valid email address." data-val-regex-pattern="^\S+@\S+\.\S+$" type="text" /></div>
```

- `span.field-validation-valid[data-valmsg-for]`: where the error message appears. Its `data-valmsg-for` must match the input's `name`.
- `i.fa-exclamation-triangle`: the error icon.
- `<em>*</em>` in the label marks the field as required visually.
- `data-val="true"` turns validation on. `data-val-required` is the "required" message. `data-val-regex` + `data-val-regex-pattern` are the format message and the pattern it has to match.

To make a field optional, drop the span, icon, `<em>*</em>` and all `data-val*` attributes. See `Comments`, or the `jem[...]` fields below.

Keep the standard field names (`FirstName`, `Email`, `Phone`, `Zip`, `Comments`, `EmailOptIn`) unchanged, since those are the names the backend reads for the lead's contact info.

### Custom fields (`jem[Group]_Field`)

Form-specific questions use the name format **`jem[GroupName]_Field_Name`**, e.g. `jem[RvDetails]_Year`, `jem[RvDetails]_Parts_Needed`. Use the same string for `name`, `id` and the label's `for`. Fields that share a group name are grouped together (here, the "RV Information" section). Spaces in the field part become `_`.

The default Parts Request form lays them out in a `.form-horizontal` with a `col-sm-5` label and a `col-sm-7` control:

```html
<div class="form-group"><label for="jem[RvDetails]_Make" class="col-sm-5 control-label text-left">What is the Make?</label>
    <div class="col-sm-7"><input class="form-control" name="jem[RvDetails]_Make" id="jem[RvDetails]_Make" type="text" /></div>
</div>
```

Use `<textarea class="form-control" ... rows="N">` for longer answers. The same pattern works for `<select class="form-control">`.

On a new form, pick one group name that describes the section (e.g. `jem[TradeIn]_Mileage`, `jem[ServiceDetails]_Preferred_Date`) and use it consistently. If the site already has forms, check their `jem[...]` names first and reuse an existing group name where it fits.

## Workflow

### Updating an existing form

1. Navigate the injector to the page with the form, then dump it with `npm run dbg -- batch`, using `find "<a label on the form>"` and `html ".well"` (or the wrapper `find` suggests).
2. List its current config fields so the user can see what's set:
   ```
   npm run dbg -- eval "[...document.querySelectorAll('input[type=hidden][name]')].map(i => ({ name: i.name, value: i.value }))"
   ```
3. Make the requested change. Leave `AjaxTarget` untouched, and keep every other config field unless the user asked to change it.
4. Save the new markup to a scratch file and preview it: `npm run dbg -- replace ".well" @<file>` (or `inner`), then `crop ".well" --at 375,768,1200` and `errors`. If the config `<p>` sits outside the `.well`, replace their common parent instead so the preview includes it. Run `restore` when done.
5. Hand the user the final, complete markup to paste into the CMS. Styling fixes go in `styles/` as usual.

### Creating a new form

1. Start from a working form: dump the site's Contact Us form (or a similar existing form) with `npm run dbg -- html ".well"`, or use default markup the user provides. If none is available, ask the user for it.
2. Add or change the custom questions as `jem[Group]_Field` fields, and relabel `Comments` if needed. Every `name`/`id`/`for` must be unique within the form.
3. Set a new, distinct `FormType`. Ask the user for the ICC label if they didn't give one. Keep `AjaxTarget` and the other standard config fields. Change `RedirectUrl` / `SuccessMessage` or add `AccountOverRideEmail` only if the user asks.
4. Preview, check and hand off the markup as in steps 4–5 above.

## Checklist before handing off

- [ ] `FormType` present, with the value the user wants in ICC.
- [ ] `AjaxTarget` present, value `/Forms/Ajax`.
- [ ] `RedirectUrl`, `SuccessMessage`, `JournalTemplate`, `AccountEmailTemplate` and `CustomerEmailTemplate` kept, unless the user changed them on purpose.
- [ ] Config field `name`s spelled with the exact casing above.
- [ ] `RedirectUrl` points to a page that exists.
- [ ] `AccountOverRideEmail` (if set) was confirmed by the user, and the intended "from" address is first.
- [ ] Every required field's `data-valmsg-for` matches its input `name`. Custom fields use a consistent `jem[Group]_` prefix, and `name` = `id` = label `for`.
- [ ] No duplicate `id`s on the page: the default forms hard-code `#FirstName`, `#Email`, `#SubmitButton`, `#RedirectUrl`, etc., so a second form on the same page clashes. Check with `npm run dbg -- select "#SubmitButton"` (count should be 1).
- [ ] Remind the user to do a real test submission after publishing and confirm it lands in ICC (and the override inbox, if set). The preview can't test that.
