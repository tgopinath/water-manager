// Google sign-in (required) and profile, shared with Gopinath's other apps: see kolam-design-system/auth.
import { KolamAuth } from 'https://tgopinath.github.io/kolam-design-system/auth/kolam-auth.js'
// Where the profile button sits in this app's header
document.head.insertAdjacentHTML('beforeend', `<style>@media (max-width:720px){header.top .ka-avatar{margin-left:auto}}</style>`)

KolamAuth.init({
  app: 'watermanager', appName: 'Water Manager', icon: 'icons/icon-192.png',
  tagline: 'Save your tanks, plots and water records to your account, so they follow you between your phone and the web.',
  fields: [
    { key: 'place', label: 'Place', placeholder: 'e.g. Madurai' },
    { key: 'size', label: 'Tank or plot size', placeholder: 'e.g. 5,000 litres or 2 acres' },
  ],
  avatarSlot: 'header.top',
  sync: ['wm-state'],
})
