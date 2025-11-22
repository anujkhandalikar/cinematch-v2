# Testing Checklist for Language OR Logic & Mutual Matches

## Test 1: Language OR Logic (Hindi + Tamil)

### Setup:
1. Open app in two browser windows/tabs (or two devices)
2. Both users select "Partner Mode"
3. User 1: Select **Hindi** language only
4. User 2: Select **Tamil** language only
5. Both users mark ready

### Expected Behavior:
- ✅ Console should show: `🎬 Using preferences:` with `languages: ['Hindi', 'Tamil']`
- ✅ Console should show: `🎬 Final prefs to use for movie fetching:` with both languages
- ✅ Movie deck should contain movies from BOTH Hindi and Tamil
- ✅ Both users should see the SAME movies in the SAME order (same seed)
- ✅ Movies should NOT be empty

### Console Logs to Check:
```
🎬 Using preferences: {
  mode: 'dual',
  hasCombinedPrefs: true,
  languages: ['Hindi', 'Tamil'],
  creatorLanguages: ['Hindi'],
  joinerLanguages: ['Tamil']
}
```

### If Test Fails:
- Check if `combinedPreferences` is being set correctly
- Check if `prefsToUse` is using combined preferences
- Check if language streaming is using `prefsToUse.languages`

---

## Test 2: Mutual Matches Detection

### Setup:
1. Open app in two browser windows/tabs (or two devices)
2. Both users select "Partner Mode"
3. Both users select same language (e.g., English) for easier testing
4. Both users mark ready
5. Both users start swiping

### Test Steps:
1. **User 1**: Swipe RIGHT on a movie (e.g., "The Dark Knight")
   - Check console: Should see `=== USER LIKED MOVIE (DUAL MODE) ===`
   - Check console: Should see `Syncing movie like with Supabase...`
   - Check console: Should see `✅ Movie like synced with partner via Supabase`

2. **User 2**: Swipe RIGHT on the SAME movie ("The Dark Knight")
   - Check console: Should see `🎬🎬🎬 PARTNER LIKE RECEIVED 🎬🎬🎬`
   - Check console: Should see `✅✅✅ Updated partnerLiked:`
   - Check console: Should see `🔍🔍🔍 SUBSCRIPTION CHECKING FOR MUTUALITY 🔍🔍🔍`
   - Check console: Should see `🎉🎉🎉 PARTNER LIKES FOUND MUTUAL MATCH!`
   - Check console: Should see `💾 STORING MUTUAL MATCHES IN SESSION`
   - **UI**: Mutual count should update from `0 mutual` to `1 mutual`

3. **User 1**: Check console
   - Should see `🔄 Recalculating mutual matches...`
   - Should see `🎉 FOUND NEW MUTUAL MATCHES:`
   - **UI**: Mutual count should update from `0 mutual` to `1 mutual`

### Expected Behavior:
- ✅ When both users like the same movie, mutual count increases
- ✅ Mutual count shows in header: `❤️ 1 mutual`, `❤️ 2 mutual`, etc.
- ✅ Console shows mutual matches being detected and stored
- ✅ Both users see the same mutual count

### Console Logs to Check:
```
🔄 Recalculating mutual matches...
User liked: [{title: 'The Dark Knight', id: '...'}]
Partner liked: [{title: 'The Dark Knight', id: '...'}]
🎯 Found new mutual match: The Dark Knight (ID: ...)
🎉 FOUND NEW MUTUAL MATCHES: ['The Dark Knight']
💾 STORING MUTUAL MATCHES IN SESSION (from useEffect): 1 matches
✅ VERIFIED: Session mutualLikes count: 1
```

### If Test Fails:
- Check if partner likes are being received (check `partnerLiked` array)
- Check if Supabase subscription is working
- Check if `useEffect` is running when likes change
- Check if `setDualModeState` is being called
- Check if session state is being updated

---

## Quick Debug Commands

### Check Session State:
```javascript
// In browser console:
useStore.getState().session?.mutualLikes?.length
useStore.getState().session?.combinedPreferences?.languages
```

### Check Local State (in SwipeDeck):
- Open React DevTools
- Find SwipeDeck component
- Check `mutualLiked`, `userLiked`, `partnerLiked` state

### Check Supabase:
- Go to Supabase Dashboard
- Check `movie_likes` table for entries
- Check `sessions` table for `mutual_matches` count

---

## Common Issues & Solutions

### Issue: "No movies" screen when both languages selected
**Solution**: Check console for `🎬 Using preferences:` - should show both languages. If not, `combinedPreferences` might not be set.

### Issue: Mutual count stays at 0
**Solution**: 
1. Check if partner likes are being received (console: `✅✅✅ Updated partnerLiked`)
2. Check if `useEffect` is running (console: `🔄 Recalculating mutual matches...`)
3. Check if Supabase subscription is active (console: `✅ Successfully subscribed to partner likes!`)

### Issue: Movies in different order for both users
**Solution**: Both users should use the same seed (0.5). Check console: `seed: 0.5` in session object.






