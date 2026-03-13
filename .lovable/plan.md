

## UI Compactness Tweaks Across Pages

Aligning Leagues, Feeds, Profile, and Match Details pages with the compact design philosophy already applied to the Home page and match cards.

### 1. Leagues Page
- Reduce sticky header padding (`p-4` to `p-3`), title font (`text-xl` to `text-base`), select height
- Shrink country flags from `text-2xl` to `text-lg`, accordion padding
- League cards: reduce logo from `w-8 h-8` to `w-6 h-6`, tighten padding (`p-3` to `p-2`)
- League detail view: shrink header logo (`w-10 h-10` to `w-7 h-7`), title to `text-base`
- Standings table: smaller text, tighter cell padding
- Fixture cards: reduce team logos (`w-6 h-6` to `w-5 h-5`), scores from `text-lg` to `text-sm`
- Top scorers: shrink player photo (`w-10 h-10` to `w-7 h-7`), rank badge (`w-8 h-8` to `w-6 h-6`)

### 2. Feeds Page
- Reduce header padding and title size to match Home page
- Tab icons from `h-4 w-4` to `h-3.5 w-3.5`
- Feed cards: reduce `CardHeader` padding, title from `text-base` to `text-sm`, icon from `h-4` to `h-3.5`
- Badge text from `text-xs` to `text-[10px]`

### 3. Profile Page
- Reduce header padding, back button icon size
- Avatar from `h-20 w-20` to `h-14 w-14`, username from `text-2xl` to `text-lg`
- Stats grid: tighten spacing, smaller labels
- Card section headers: smaller text and icons
- Premium card, settings, about sections: reduce padding and font sizes
- Daily check-in grid: more compact

### 4. Match Details Page
- Header: already compact, minor tightening
- Match header card: reduce team logos from `w-10 h-10` to `w-8 h-8`, scores from `text-2xl` to `text-xl`
- Statistics: reduce stat values from `text-2xl` to `text-lg`
- AI Prediction: reduce Brain icon from `h-12` to `h-8`, percentage values from `text-2xl` to `text-lg`, correct score from `text-4xl` to `text-2xl`
- Lineups: reduce substitute player number badges from `w-8 h-8` to `w-6 h-6`
- Media grid: tighter spacing

