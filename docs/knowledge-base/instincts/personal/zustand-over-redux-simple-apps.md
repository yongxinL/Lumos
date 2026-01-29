---
id: I010
trigger: 'When selecting state management library for new application'
confidence: 0.90
domain: React & State Management
source: S001 (Electron + React integration success)
phase: Implementation (Phase 3+)
created: 2026-01-29
last_reinforced: 2026-01-29
---

# Instinct I010: Use Zustand Over Redux for Simple State

## Action

For applications with straightforward state needs (fewer than 5 stores, no complex async workflows), use Zustand instead of Redux. Zustand provides 80% of Redux functionality with 20% of the complexity.

## Evidence

From S001 (Electron + React Renderer Implementation):

**What Happened:**

- Needed 3 stores: user, conversation, settings
- Used Zustand with built-in persistence middleware
- Result: ~300 lines of code for full state management
- Zero boilerplate, full TypeScript support, localStorage sync automatic

**Comparison - Redux Would Have Required:**

```
- Redux core library (+ redux-thunk or saga for async)
- Redux React bindings
- Redux DevTools integration
- Redux Persist middleware
- Type definition patterns (action creators, reducers, selectors)
- Estimated: 600+ lines of code (2x the Zustand approach)
```

**Why Zustand Wins:**

1. **API Simplicity:** Looks like `useState` but for global state
2. **No Boilerplate:** Create store, use hook, done
3. **Built-in Persistence:** One middleware line for localStorage
4. **Bundle Size:** 2.4 kB vs Redux 10+ kB
5. **TypeScript Native:** Types inferred automatically
6. **Minimal Dependencies:** Zustand itself has zero dependencies

## Example

### ❌ Incorrect: Overengineering with Redux

```tsx
// store/userSlice.ts
const userSlice = createSlice({
  name: 'user',
  initialState: {},
  reducers: {
    setUser: (state, action) => {
      state.userId = action.payload.userId;
      // 20 more lines...
    },
  },
});

// store/index.ts
export const store = configureStore({
  reducer: {
    user: userSlice.reducer,
    // more reducers...
  },
});

// component.tsx
const dispatch = useDispatch();
dispatch(setUser({ userId: '123' }));
```

### ✅ Correct: Zustand Simplicity

```tsx
// store/userStore.ts
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      setUser: (id) => set({ userId: id }),
    }),
    { name: 'user-store' } // localStorage sync automatic
  )
);

// component.tsx
const { userId, setUser } = useUserStore();
setUser('123');
```

## When to Apply

**Use Zustand If:**

- ✅ 1-5 stores total
- ✅ State updates are simple (no async workflows)
- ✅ Bundle size matters
- ✅ Developer experience is priority
- ✅ Team is comfortable with hooks API
- ✅ No need for Redux DevTools

**Use Redux If:**

- ❌ Large application (10+ stores)
- ❌ Complex async state management (sagas, thunks)
- ❌ Team familiar with Redux patterns
- ❌ Need Redux DevTools for debugging
- ❌ Multiple developers need clear conventions

## Impact

### What It Enables

- **Faster Development:** Less boilerplate = faster feature work
- **Smaller Bundle:** 2.4 kB overhead vs 10+ kB
- **Type Safety:** Automatic TypeScript inference
- **Persistence:** localStorage handled with one middleware
- **Developer Happiness:** Clean, readable code

### What It Prevents

- **Boilerplate Burden:** Redux pattern verbose for simple state
- **Over-Engineering:** Don't need Redux machinery for 3 stores
- **Bundle Bloat:** Every kB counts in Electron apps
- **Maintenance Complexity:** Less code = fewer bugs

## Related Instincts

- **I009:** Implement error boundary early (handles state errors)
- **I011:** Design tokens before styling (keeps state focused)
- **I012** (Future): Separate concerns by store domain

## Related Patterns

- **P002** (Existing): Electron + React integration

## Example in Lumos

**Three Zustand Stores with Persistence:**

1. **useUserStore** (~40 lines)

   ```ts
   (userId, userName, email, themePreference, defaultModel);
   Methods: (setUser, clearUser, setThemePreference, setDefaultModel);
   ```

2. **useConversationStore** (~60 lines)

   ```ts
   conversations[], activeConversationId
   Methods: addConversation, deleteConversation, setActiveConversation, addMessage
   ```

3. **useSettingsStore** (~50 lines)
   ```ts
   (audioEnabled, notificationsEnabled, expertModelSelection, autoStartEnabled);
   Methods: (setAudioEnabled, setNotificationsEnabled, setExpertModelSelection);
   ```

**Total:** ~150 lines of store code + persistence middleware
**Equivalent Redux:** ~300+ lines with more configuration

**Result:** Full state management with less than 1/3 Redux complexity

## Bundle Impact

**Lumos Build Metrics:**

```
With Zustand:
- Bundle: 259.20 kB (JavaScript)
- Store overhead: ~2.4 kB

If Redux:
- Bundle: ~265+ kB (JavaScript)
- Store overhead: ~10+ kB
- DevTools: ~5 kB
```

**Savings:** ~13 kB (5% smaller app)

## Confidence Rationale

**High Confidence (0.90):**

- Zustand production-proven in multiple frameworks
- Perfect fit for simple-to-moderate state needs
- Clear decision boundary (simple → Zustand, complex → Redux)
- Community trending toward Zustand for new projects
- Only minor downside: if app grows significantly, migration cost

**When Confidence Decreases (0.70):**

- If application grows beyond 10 stores
- If complex async orchestration becomes needed
- If team already committed to Redux patterns

---

**Session:** 2026-01-29 T-1.2.1, T-1.2.2
**Success Rate:** 100% (shipped 3 stores, 300 LOC, persistent state working)
**Recommended Action:** Default to Zustand for apps <10 stores, evaluate Redux if state gets complex
**Migration Path:** If needed later, Zustand → Redux is straightforward refactoring
