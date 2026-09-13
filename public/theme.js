// Runs before styles and React to avoid a bright flash on dark-mode startup.
;(function () {
  var key = 'renover-theme'
  var root = document.documentElement
  var media = window.matchMedia('(prefers-color-scheme: dark)')
  function valid(value) {
    return value === 'light' || value === 'dark' ? value : 'system'
  }
  var preference = 'system'
  try {
    preference = valid(localStorage.getItem(key))
  } catch (_) {
    /* Storage may be unavailable. */
  }
  function apply() {
    var theme =
      preference === 'system' ? (media.matches ? 'dark' : 'light') : preference
    root.dataset.themePreference = preference
    root.dataset.theme = theme
    root.style.colorScheme = theme
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = theme === 'dark' ? '#111c18' : '#f5f5ef'
    window.dispatchEvent(new Event('renover-theme-updated'))
  }
  window.addEventListener('renover-theme-change', function (event) {
    preference = valid(event.detail)
    try {
      localStorage.setItem(key, preference)
    } catch (_) {
      /* Keep the choice for this visit. */
    }
    apply()
  })
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) {
      preference = valid(event.newValue)
      apply()
    }
  })
  media.addEventListener('change', apply)
  document.addEventListener('DOMContentLoaded', apply, { once: true })
  apply()
})()
