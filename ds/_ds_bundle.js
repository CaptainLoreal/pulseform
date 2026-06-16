/* @ds-bundle: {"format":3,"namespace":"PulseformDesignSystem_ec19d3","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Switch","sourcePath":"components/core/Switch.jsx"},{"name":"MetricCard","sourcePath":"components/data/MetricCard.jsx"},{"name":"ScoreRing","sourcePath":"components/data/ScoreRing.jsx"},{"name":"SignalBar","sourcePath":"components/data/SignalBar.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"5fa6665dc30a","components/core/Badge.jsx":"f71aa64740bb","components/core/Button.jsx":"1781bdf433c6","components/core/Card.jsx":"4a0a4d535bd5","components/core/Input.jsx":"0cdc9ee4df20","components/core/Switch.jsx":"96d434e557e4","components/data/MetricCard.jsx":"f02741177d95","components/data/ScoreRing.jsx":"d600d3080f66","components/data/SignalBar.jsx":"f20dfd6d8141","ui_kits/app/screens.jsx":"3e52be551a68"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PulseformDesignSystem_ec19d3 = window.PulseformDesignSystem_ec19d3 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-avatar-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-avatar {
    --pf-sz: 40px;
    width: var(--pf-sz); height: var(--pf-sz); flex: none;
    border-radius: var(--radius-pill); overflow: hidden;
    display: inline-flex; align-items: center; justify-content: center;
    font-family: var(--font-sans); font-weight: 700; line-height: 1;
    background: var(--teal-100); color: var(--teal-700);
    font-size: calc(var(--pf-sz) * 0.38);
    box-shadow: inset 0 0 0 1px rgba(14,18,17,0.06);
  }
  .pf-avatar--sm { --pf-sz: 28px; }
  .pf-avatar--lg { --pf-sz: 56px; }
  .pf-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  `;
  document.head.appendChild(el);
}
function Avatar({
  src = null,
  name = '',
  size = 'md',
  className = '',
  ...rest
}) {
  ensureStyles();
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  const cls = ['pf-avatar', size !== 'md' ? `pf-avatar--${size}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials || '?');
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-badge-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-badge {
    display: inline-flex; align-items: center; gap: 6px;
    height: 24px; padding: 0 10px;
    font-family: var(--font-sans); font-size: 12px; font-weight: 600;
    letter-spacing: 0; line-height: 1; white-space: nowrap;
    border-radius: var(--radius-pill); border: 1px solid transparent;
  }
  .pf-badge--mono { font-family: var(--font-mono); font-weight: 700; font-size: 11px;
    letter-spacing: 0.04em; text-transform: uppercase; }
  .pf-badge__dot { width: 7px; height: 7px; border-radius: 999px; background: currentColor; }

  .pf-badge--ready   { background: var(--ready-50);   color: var(--teal-700); }
  .pf-badge--caution { background: var(--caution-50); color: var(--caution-600); }
  .pf-badge--strain  { background: var(--strain-50);  color: var(--strain-600); }
  .pf-badge--neutral { background: var(--surface-sunken); color: var(--text-muted); }
  .pf-badge--accent  { background: var(--accent-soft); color: var(--text-accent); }

  .pf-badge--solid.pf-badge--ready   { background: var(--ready-500);   color: #fff; }
  .pf-badge--solid.pf-badge--caution { background: var(--caution-500); color: #fff; }
  .pf-badge--solid.pf-badge--strain  { background: var(--strain-500);  color: #fff; }
  .pf-badge--solid.pf-badge--neutral { background: var(--ink-800);     color: #fff; }
  .pf-badge--solid.pf-badge--accent  { background: var(--accent);      color: #fff; }
  .pf-badge--outline { background: transparent; border-color: var(--border-default); color: var(--text-body); }
  `;
  document.head.appendChild(el);
}
function Badge({
  children,
  tone = 'neutral',
  solid = false,
  outline = false,
  dot = false,
  mono = false,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['pf-badge', `pf-badge--${tone}`, solid ? 'pf-badge--solid' : '', outline ? 'pf-badge--outline' : '', mono ? 'pf-badge--mono' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "pf-badge__dot"
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-button-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-btn {
    --pf-h: 44px; --pf-px: 20px; --pf-fs: 15px;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    height: var(--pf-h); padding: 0 var(--pf-px);
    font-family: var(--font-sans); font-size: var(--pf-fs); font-weight: 600;
    letter-spacing: -0.01em; line-height: 1; white-space: nowrap;
    border: 1px solid transparent; border-radius: var(--radius-control);
    cursor: pointer; user-select: none; text-decoration: none;
    transition: background var(--duration-fast) var(--ease-standard),
                border-color var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard),
                transform var(--duration-fast) var(--ease-standard),
                color var(--duration-fast) var(--ease-standard);
  }
  .pf-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--accent-soft), 0 0 0 4px var(--focus-ring); }
  .pf-btn:active { transform: translateY(1px); }
  .pf-btn[disabled], .pf-btn[aria-disabled="true"] { opacity: 0.45; pointer-events: none; }
  .pf-btn--sm { --pf-h: 36px; --pf-px: 14px; --pf-fs: 13px; }
  .pf-btn--lg { --pf-h: 52px; --pf-px: 26px; --pf-fs: 16px; }
  .pf-btn--block { width: 100%; }
  .pf-btn--pill { border-radius: var(--radius-pill); }

  .pf-btn--primary { background: linear-gradient(180deg, var(--teal-500), var(--teal-600)); color: var(--accent-on); box-shadow: var(--shadow-accent); }
  .pf-btn--primary:hover { background: linear-gradient(180deg, var(--teal-600), var(--teal-700)); }

  .pf-btn--secondary { background: var(--surface-card); color: var(--text-strong); border-color: var(--border-default); box-shadow: var(--shadow-xs); }
  .pf-btn--secondary:hover { border-color: var(--border-strong); background: var(--surface-sunken); }

  .pf-btn--ghost { background: transparent; color: var(--text-body); }
  .pf-btn--ghost:hover { background: var(--surface-sunken); color: var(--text-strong); }

  .pf-btn--subtle { background: var(--accent-soft); color: var(--text-accent); }
  .pf-btn--subtle:hover { background: var(--teal-100); }

  .pf-btn--danger { background: var(--strain-500); color: #fff; }
  .pf-btn--danger:hover { background: var(--strain-600); }

  .pf-btn__icon { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; }
  .pf-btn__icon svg { width: 100%; height: 100%; display: block; }
  `;
  document.head.appendChild(el);
}
function Button({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  block = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  as = 'button',
  className = '',
  ...rest
}) {
  ensureStyles();
  const Tag = as;
  const cls = ['pf-btn', `pf-btn--${variant}`, size !== 'md' ? `pf-btn--${size}` : '', pill ? 'pf-btn--pill' : '', block ? 'pf-btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls,
    disabled: Tag === 'button' ? disabled : undefined,
    "aria-disabled": disabled || undefined
  }, rest), leadingIcon && /*#__PURE__*/React.createElement("span", {
    className: "pf-btn__icon"
  }, leadingIcon), children, trailingIcon && /*#__PURE__*/React.createElement("span", {
    className: "pf-btn__icon"
  }, trailingIcon));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-card-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-card {
    background: var(--surface-card); border: 1px solid var(--border-subtle);
    border-radius: var(--radius-card); box-shadow: var(--shadow-sm);
    padding: var(--space-5); color: var(--text-body);
  }
  .pf-card--flat { box-shadow: none; }
  .pf-card--raised { box-shadow: var(--shadow-md); border-color: transparent; }
  .pf-card--sunken { background: var(--surface-sunken); box-shadow: none; }
  .pf-card--inverse { background: var(--surface-inverse); border-color: var(--border-inverse); color: #fff; }
  .pf-card--accent { background: var(--accent-soft); border-color: var(--border-accent); }
  .pf-card--interactive { cursor: pointer; transition: box-shadow var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard); }
  .pf-card--interactive:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }

  .pf-card__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: var(--space-4); }
  .pf-card__title { font-family: var(--font-sans); font-size: 16px; font-weight: 700; color: var(--text-strong); margin: 0; }
  .pf-card--inverse .pf-card__title { color: #fff; }
  `;
  document.head.appendChild(el);
}
function Card({
  children,
  variant = 'default',
  interactive = false,
  title = null,
  action = null,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['pf-card', variant !== 'default' ? `pf-card--${variant}` : '', interactive ? 'pf-card--interactive' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), (title || action) && /*#__PURE__*/React.createElement("div", {
    className: "pf-card__head"
  }, title && /*#__PURE__*/React.createElement("h3", {
    className: "pf-card__title"
  }, title), action), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-input-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-field { display: flex; flex-direction: column; gap: 7px; font-family: var(--font-sans); }
  .pf-field__label { font-size: 13px; font-weight: 600; color: var(--text-strong); }
  .pf-field__hint { font-size: 12px; color: var(--text-muted); }
  .pf-field__error { font-size: 12px; color: var(--strain-600); }
  .pf-input-wrap {
    display: flex; align-items: center; gap: 10px;
    height: 46px; padding: 0 14px;
    background: var(--surface-card); border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    transition: border-color var(--duration-fast) var(--ease-standard),
                box-shadow var(--duration-fast) var(--ease-standard);
  }
  .pf-input-wrap:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .pf-input-wrap--error { border-color: var(--strain-500); }
  .pf-input-wrap--error:focus-within { box-shadow: 0 0 0 3px var(--strain-50); }
  .pf-input-wrap--disabled { background: var(--surface-sunken); opacity: 0.6; pointer-events: none; }
  .pf-input {
    flex: 1; min-width: 0; border: none; outline: none; background: transparent;
    font-family: var(--font-sans); font-size: 15px; color: var(--text-strong);
  }
  .pf-input::placeholder { color: var(--text-faint); }
  .pf-input__adorn { display: inline-flex; color: var(--text-muted); width: 18px; height: 18px; }
  .pf-input__adorn svg { width: 100%; height: 100%; }
  `;
  document.head.appendChild(el);
}
function Input({
  label,
  hint,
  error,
  leadingIcon = null,
  trailingIcon = null,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const fieldId = id || (label ? `pf-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    className: ['pf-field', className].filter(Boolean).join(' ')
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "pf-field__label",
    htmlFor: fieldId
  }, label), /*#__PURE__*/React.createElement("div", {
    className: ['pf-input-wrap', error ? 'pf-input-wrap--error' : '', disabled ? 'pf-input-wrap--disabled' : ''].filter(Boolean).join(' ')
  }, leadingIcon && /*#__PURE__*/React.createElement("span", {
    className: "pf-input__adorn"
  }, leadingIcon), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    className: "pf-input",
    disabled: disabled
  }, rest)), trailingIcon && /*#__PURE__*/React.createElement("span", {
    className: "pf-input__adorn"
  }, trailingIcon)), error ? /*#__PURE__*/React.createElement("span", {
    className: "pf-field__error"
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "pf-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-switch-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-family: var(--font-sans); }
  .pf-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
  .pf-switch__track {
    width: 44px; height: 26px; border-radius: 999px; flex: none;
    background: var(--ink-200); position: relative;
    transition: background var(--duration-base) var(--ease-standard);
  }
  .pf-switch__thumb {
    position: absolute; top: 3px; left: 3px; width: 20px; height: 20px;
    border-radius: 999px; background: #fff; box-shadow: var(--shadow-sm);
    transition: transform var(--duration-base) var(--ease-out);
  }
  .pf-switch input:checked + .pf-switch__track { background: var(--accent); }
  .pf-switch input:checked + .pf-switch__track .pf-switch__thumb { transform: translateX(18px); }
  .pf-switch input:focus-visible + .pf-switch__track { box-shadow: 0 0 0 3px var(--accent-soft); }
  .pf-switch__label { font-size: 14px; color: var(--text-strong); }
  .pf-switch--disabled { opacity: 0.5; pointer-events: none; }
  `;
  document.head.appendChild(el);
}
function Switch({
  checked,
  defaultChecked,
  onChange,
  label,
  disabled = false,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("label", {
    className: ['pf-switch', disabled ? 'pf-switch--disabled' : '', className].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "pf-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-switch__thumb"
  })), label && /*#__PURE__*/React.createElement("span", {
    className: "pf-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Switch.jsx", error: String((e && e.message) || e) }); }

// components/data/MetricCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-metric-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-metric {
    display: flex; flex-direction: column; gap: 2px;
    background: var(--surface-card); border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg); padding: var(--space-4);
    font-family: var(--font-sans); box-shadow: var(--shadow-xs);
  }
  .pf-metric__icon {
    width: 34px; height: 34px; border-radius: var(--radius-sm);
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--accent-soft); color: var(--text-accent); margin-bottom: 8px;
  }
  .pf-metric__icon svg { width: 18px; height: 18px; }
  .pf-metric__icon--ready   { background: var(--ready-50);   color: var(--teal-700); }
  .pf-metric__icon--caution { background: var(--caution-50); color: var(--caution-600); }
  .pf-metric__icon--strain  { background: var(--strain-50);  color: var(--strain-600); }
  .pf-metric__label { font-size: 12px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.01em; }
  .pf-metric__value { font-family: var(--font-display); font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: var(--text-strong); font-variant-numeric: tabular-nums; line-height: 1.1; }
  .pf-metric__unit { font-family: var(--font-mono); font-size: 12px; font-weight: 400; color: var(--text-faint); margin-left: 3px; }
  .pf-metric__sub { font-size: 12px; color: var(--text-faint); margin-top: 2px; }
  `;
  document.head.appendChild(el);
}
function MetricCard({
  icon = null,
  label,
  value,
  unit = null,
  sub = null,
  tone = 'accent',
  className = '',
  ...rest
}) {
  ensureStyles();
  const iconTone = tone === 'accent' ? '' : `pf-metric__icon--${tone}`;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-metric', className].filter(Boolean).join(' ')
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    className: ['pf-metric__icon', iconTone].filter(Boolean).join(' ')
  }, icon), /*#__PURE__*/React.createElement("span", {
    className: "pf-metric__label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "pf-metric__value"
  }, value, unit && /*#__PURE__*/React.createElement("span", {
    className: "pf-metric__unit"
  }, unit)), sub && /*#__PURE__*/React.createElement("span", {
    className: "pf-metric__sub"
  }, sub));
}
Object.assign(__ds_scope, { MetricCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MetricCard.jsx", error: String((e && e.message) || e) }); }

// components/data/ScoreRing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-scorering-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-ring { position: relative; display: inline-grid; place-items: center; font-family: var(--font-display); }
  .pf-ring svg { display: block; transform: rotate(-90deg); }
  .pf-ring__arc { transition: stroke-dashoffset 900ms var(--ease-out); }
  .pf-ring__center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .pf-ring__value { font-weight: 800; letter-spacing: -0.04em; line-height: 1; font-variant-numeric: tabular-nums; color: var(--text-strong); }
  .pf-ring__max { font-family: var(--font-mono); font-size: 12px; color: var(--text-faint); margin-top: 2px; }
  .pf-ring__cap { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
  `;
  document.head.appendChild(el);
}
const TONE_COLOR = {
  ready: 'var(--signal-ready)',
  caution: 'var(--signal-caution)',
  strain: 'var(--signal-strain)'
};
function toneFor(value, max) {
  const pct = value / max * 100;
  if (pct >= 67) return 'ready';
  if (pct >= 40) return 'caution';
  return 'strain';
}
function ScoreRing({
  value = 0,
  max = 100,
  label = null,
  caption = null,
  tone,
  size = 180,
  thickness = 14,
  className = '',
  ...rest
}) {
  ensureStyles();
  const t = tone || toneFor(value, max);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = circ * (1 - pct);
  const valueSize = Math.round(size * 0.3);
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-ring', className].filter(Boolean).join(' '),
    style: {
      width: size,
      height: size
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--track)",
    strokeWidth: thickness
  }), /*#__PURE__*/React.createElement("circle", {
    className: "pf-ring__arc",
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: TONE_COLOR[t],
    strokeWidth: thickness,
    strokeLinecap: "round",
    strokeDasharray: circ,
    strokeDashoffset: offset
  })), /*#__PURE__*/React.createElement("div", {
    className: "pf-ring__center"
  }, caption && /*#__PURE__*/React.createElement("span", {
    className: "pf-ring__cap"
  }, caption), /*#__PURE__*/React.createElement("span", {
    className: "pf-ring__value",
    style: {
      fontSize: valueSize
    }
  }, value), label !== null ? /*#__PURE__*/React.createElement("span", {
    className: "pf-ring__max"
  }, label) : /*#__PURE__*/React.createElement("span", {
    className: "pf-ring__max"
  }, "/ ", max)));
}
Object.assign(__ds_scope, { ScoreRing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ScoreRing.jsx", error: String((e && e.message) || e) }); }

// components/data/SignalBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STYLE_ID = 'pf-signalbar-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
  .pf-signal { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-sans); }
  .pf-signal__top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .pf-signal__label { font-size: 13px; font-weight: 600; color: var(--text-strong); }
  .pf-signal__val { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--text-muted); font-variant-numeric: tabular-nums; }
  .pf-signal__track { height: 8px; border-radius: 999px; background: var(--track); overflow: hidden; }
  .pf-signal__fill { height: 100%; border-radius: 999px; transition: width 800ms var(--ease-out); }
  .pf-signal__fill--ready   { background: var(--signal-ready); }
  .pf-signal__fill--caution { background: var(--signal-caution); }
  .pf-signal__fill--strain  { background: var(--signal-strain); }
  .pf-signal__fill--accent  { background: var(--accent); }
  `;
  document.head.appendChild(el);
}
function toneFor(pct) {
  if (pct >= 67) return 'ready';
  if (pct >= 40) return 'caution';
  return 'strain';
}
function SignalBar({
  value = 0,
  max = 100,
  label = null,
  showValue = true,
  tone,
  valueSuffix = '',
  className = '',
  ...rest
}) {
  ensureStyles();
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const t = tone || toneFor(pct);
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-signal', className].filter(Boolean).join(' ')
  }, rest), (label || showValue) && /*#__PURE__*/React.createElement("div", {
    className: "pf-signal__top"
  }, label && /*#__PURE__*/React.createElement("span", {
    className: "pf-signal__label"
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    className: "pf-signal__val"
  }, value, valueSuffix)), /*#__PURE__*/React.createElement("div", {
    className: "pf-signal__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: `pf-signal__fill pf-signal__fill--${t}`,
    style: {
      width: `${pct}%`
    }
  })));
}
Object.assign(__ds_scope, { SignalBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SignalBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/screens.jsx
try { (() => {
/* Pulseform app — UI kit screens.
   Composes Design System primitives from window.PulseformDesignSystem_ec19d3.
   Exports screens + helpers to window for index.html to mount. */

const PF = window.PulseformDesignSystem_ec19d3;
const {
  Button,
  Badge,
  Avatar,
  Card,
  Input,
  Switch,
  ScoreRing,
  MetricCard,
  SignalBar
} = PF;

/* ---- icons (Lucide paths) ---- */
const ICONS = {
  heart: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3 5.5 5.5 0 0 0 12 5.5 5.5 5.5 0 0 0 7.5 3 5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  bolt: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  info: "M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 18l-6-6 6-6",
  home: "M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  user: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  check: "M20 6 9 17l-5-5",
  chevronRight: "M9 6l6 6-6 6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
};
function Icon({
  name,
  size = 20,
  stroke = 2,
  className = ''
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: ICONS[name]
  }));
}

/* ---- status bar ---- */
function StatusBar({
  dark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "pf-status" + (dark ? " pf-status--dark" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-status__time"
  }, "9:41"), /*#__PURE__*/React.createElement("span", {
    className: "pf-status__icons"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "11",
    viewBox: "0 0 17 11",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "6",
    width: "3",
    height: "5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.5",
    y: "4",
    width: "3",
    height: "7",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "2",
    width: "3",
    height: "9",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "0",
    width: "3",
    height: "11",
    rx: "1"
  })), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "11",
    viewBox: "0 0 16 11",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2.2c2 0 3.8.8 5.2 2l1.1-1.2A9.4 9.4 0 0 0 8 .4 9.4 9.4 0 0 0 1.7 3l1.1 1.2A7.6 7.6 0 0 1 8 2.2z",
    opacity: ".9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 5.4c1.1 0 2.2.4 3 1.2l1.1-1.2A6 6 0 0 0 8 3.6a6 6 0 0 0-4.1 1.8L5 6.6c.8-.8 1.9-1.2 3-1.2z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "9",
    r: "1.6"
  })), /*#__PURE__*/React.createElement("svg", {
    width: "25",
    height: "12",
    viewBox: "0 0 25 12",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "1",
    y: "1",
    width: "21",
    height: "10",
    rx: "2.5",
    stroke: "currentColor",
    opacity: ".4"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2.5",
    y: "2.5",
    width: "16",
    height: "7",
    rx: "1.5",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "23",
    y: "4",
    width: "1.5",
    height: "4",
    rx: "0.75",
    fill: "currentColor",
    opacity: ".5"
  }))));
}

/* ---- bottom tab bar ---- */
function TabBar({
  active,
  onChange
}) {
  const tabs = [['today', 'Today', 'home'], ['runs', 'Runs', 'activity'], ['plan', 'Plan', 'calendar'], ['you', 'You', 'user']];
  return /*#__PURE__*/React.createElement("nav", {
    className: "pf-tabbar"
  }, tabs.map(([id, label, icon]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    className: "pf-tab" + (active === id ? " pf-tab--on" : ""),
    onClick: () => onChange(id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22,
    stroke: active === id ? 2.4 : 2
  }), /*#__PURE__*/React.createElement("span", null, label))));
}

/* ============================================================ WAITLIST */
function WaitlistScreen({
  onJoin
}) {
  const [email, setEmail] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    className: "pf-screen pf-screen--dark"
  }, /*#__PURE__*/React.createElement(StatusBar, {
    dark: true
  }), /*#__PURE__*/React.createElement("div", {
    className: "pf-wait"
  }, /*#__PURE__*/React.createElement("img", {
    className: "pf-wait__mark",
    src: "../../assets/logo/pulseform-mark-white.png",
    alt: "Pulseform"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pf-wait__spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pf-eyebrow pf-eyebrow--light"
  }, "Early access"), /*#__PURE__*/React.createElement("h1", {
    className: "pf-wait__title"
  }, "Train with your body, not against it."), /*#__PURE__*/React.createElement("p", {
    className: "pf-wait__sub"
  }, "One score. Two signals \u2014 physiological readiness and biomechanical stability, at a glance."), /*#__PURE__*/React.createElement("div", {
    className: "pf-wait__form"
  }, /*#__PURE__*/React.createElement("input", {
    className: "pf-darkinput",
    placeholder: "you@runner.com",
    value: email,
    onChange: e => setEmail(e.target.value)
  }), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true,
    onClick: onJoin,
    trailingIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "arrowRight",
      size: 18
    })
  }, "Join the waitlist"), /*#__PURE__*/React.createElement("p", {
    className: "pf-wait__fine"
  }, "\u20AC199 sensor kit \xB7 \u20AC14.99/mo coaching. Cancel anytime."))));
}

/* ============================================================ DASHBOARD */
function DashboardScreen() {
  return /*#__PURE__*/React.createElement("div", {
    className: "pf-screen"
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    className: "pf-scroll"
  }, /*#__PURE__*/React.createElement("header", {
    className: "pf-apphead"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "pf-eyebrow"
  }, "Tuesday \xB7 Easy week"), /*#__PURE__*/React.createElement("h2", {
    className: "pf-apphead__title"
  }, "Good morning, Jordan")), /*#__PURE__*/React.createElement(Avatar, {
    name: "Jordan Diaz"
  })), /*#__PURE__*/React.createElement(Card, {
    className: "pf-scorecard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pf-scorecard__cap"
  }, "RunReady Score"), /*#__PURE__*/React.createElement(ScoreRing, {
    value: 62,
    size: 196,
    thickness: 15
  }), /*#__PURE__*/React.createElement(Badge, {
    tone: "caution",
    dot: true
  }, "Train, but adapt intensity")), /*#__PURE__*/React.createElement("div", {
    className: "pf-metricgrid"
  }, /*#__PURE__*/React.createElement(MetricCard, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "heart",
      size: 18
    }),
    label: "HRV Readiness",
    value: 78,
    sub: "within baseline",
    tone: "ready"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "pulse",
      size: 18
    }),
    label: "Training Load",
    value: 69,
    sub: "moderate ramp-up",
    tone: "accent"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "bolt",
      size: 18
    }),
    label: "Stability Reserve",
    value: 52,
    sub: "form drops under fatigue",
    tone: "caution"
  }), /*#__PURE__*/React.createElement(MetricCard, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "info",
      size: 18
    }),
    label: "Symptoms",
    value: 86,
    sub: "no pain reported",
    tone: "ready"
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Signals today",
    className: "pf-signals"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pf-signals__list"
  }, /*#__PURE__*/React.createElement(SignalBar, {
    label: "Knee stability",
    value: 52,
    valueSuffix: "%"
  }), /*#__PURE__*/React.createElement(SignalBar, {
    label: "Recovery",
    value: 81,
    valueSuffix: "%"
  }), /*#__PURE__*/React.createElement(SignalBar, {
    label: "Cadence consistency",
    value: 74,
    valueSuffix: "%"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pf-scroll__pad"
  })));
}

/* ============================================================ ADAPT */
function AdaptScreen({
  onStart,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "pf-screen"
  }, /*#__PURE__*/React.createElement(StatusBar, null), /*#__PURE__*/React.createElement("div", {
    className: "pf-scroll"
  }, /*#__PURE__*/React.createElement("header", {
    className: "pf-apphead pf-apphead--back"
  }, /*#__PURE__*/React.createElement("button", {
    className: "pf-iconbtn",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrowLeft",
    size: 20
  })), /*#__PURE__*/React.createElement("h2", {
    className: "pf-apphead__title pf-apphead__title--sm"
  }, "Tomorrow's workout"), /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    mono: true
  }, "Adapted")), /*#__PURE__*/React.createElement(Card, {
    variant: "accent",
    className: "pf-why"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pf-why__title"
  }, "Why we changed it"), /*#__PURE__*/React.createElement("ul", {
    className: "pf-why__list"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "pf-why__dot pf-why__dot--ready"
  }), /*#__PURE__*/React.createElement("span", null, "HRV is within baseline")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "pf-why__dot pf-why__dot--caution"
  }), /*#__PURE__*/React.createElement("span", null, "Cadence drift increased after 7.8 km")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "pf-why__dot pf-why__dot--strain"
  }), /*#__PURE__*/React.createElement("span", null, "Right knee tracking changed repeatedly under fatigue")))), /*#__PURE__*/React.createElement("div", {
    className: "pf-section-label"
  }, "Today's stability focus"), /*#__PURE__*/React.createElement("div", {
    className: "pf-drills"
  }, [['Step-down control', '3 × 8 each side'], ['Side plank with leg raise', '3 × 30 sec'], ['Single-leg squat to box', '3 × 6 each side']].map(([name, dose]) => /*#__PURE__*/React.createElement("button", {
    key: name,
    className: "pf-drill"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-drill__dot"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pf-drill__body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-drill__name"
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "pf-drill__dose"
  }, dose)), /*#__PURE__*/React.createElement(Icon, {
    name: "chevronRight",
    size: 18,
    className: "pf-drill__chev"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "pf-adapt-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true,
    onClick: onStart
  }, "Start adapted session"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    block: true,
    onClick: onBack
  }, "Keep original plan")), /*#__PURE__*/React.createElement("div", {
    className: "pf-scroll__pad"
  })));
}
Object.assign(window, {
  Icon,
  StatusBar,
  TabBar,
  WaitlistScreen,
  DashboardScreen,
  AdaptScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/screens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.MetricCard = __ds_scope.MetricCard;

__ds_ns.ScoreRing = __ds_scope.ScoreRing;

__ds_ns.SignalBar = __ds_scope.SignalBar;

})();
