export type BlogPost = {
  slug: string
  title: string
  category: string
  phase: string
  excerpt: string
  bodyHtml: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-vet-a-buyer',
    title: 'How to Vet a Buyer Before You Ever Meet Them',
    category: 'Buyer Screening',
    phase: 'Choosing buyers',
    excerpt: "What to look for in the first message so you're not guessing who's serious 40 inquiries in.",
    bodyHtml: `
      <p>By the time a bad buyer becomes a bad <em>situation</em> — a bounced payment, a puppy returned three weeks later, a screaming match in your driveway — it's already too late to have prevented it. The vetting happens earlier, in the messages you almost don't bother reading closely because you're excited someone's interested.</p>
      <p>Here's what to look at.</p>
      <h3>The first message tells you more than you think</h3>
      <p>Most breeders read the first inquiry for enthusiasm. Read it for specifics instead. "I love goldens, when can I see photos?" tells you nothing. "We have a 6-year-old lab, a fenced half-acre, and we're looking for a lower-energy female for a family with two kids under 10" tells you they've thought about what a dog in their house looks like.</p>
      <p>It's not a hard rule: plenty of great homes write short first messages. It's still your first data point, and it costs you nothing to notice.</p>
      <h3>Ask questions you can't Google</h3>
      <p>Anyone can say "we're an active family" or "we have plenty of time." Ask things that require them to have lived the answer:</p>
      <ul>
        <li>Who's home during the day, and what does a normal Tuesday look like?</li>
        <li>What happens to the dog if you travel?</li>
        <li>Have you owned this breed before — what did you love and what surprised you?</li>
        <li>What's your plan for the first two weeks?</li>
      </ul>
      <p>Vague or rehearsed-sounding answers aren't automatically disqualifying, but they're a reason to slow down, not speed up.</p>
      <h3>A deposit request is useful information</h3>
      <p>A buyer who balks at a deposit before they've even met a puppy is telling you something. They may not be ready yet, or not able to commit financially to something they're about to commit to emotionally. Either way, you want to know <em>before</em> you've held a puppy for them for six weeks.</p>
      <p>This is also where a lot of breeders lose money without realizing it: a "soft hold" with no deposit is really just an inquiry with extra steps. If someone's not ready to put money down, they're not ready to be at the top of your list yet.</p>
      <h3>Watch how they handle "no"</h3>
      <p>If you tell a buyer you don't have their preferred color, sex, or timeline available, how they react tells you a lot. Someone who asks thoughtful follow-up questions ("what do you have instead, and when's your next litter?") is a very different signal than someone who gets pushy or disappears without a word — both are worth remembering if they come back.</p>
      <h3>Build a system, not suspicion</h3>
      <p>None of this means treating every inquiry like a threat. Most people reaching out for a puppy are genuinely excited, first-time or fifth-time owners, and perfectly good homes. Vetting is just a consistent, repeatable way to tell the difference between "excited and ready" and "excited and not there yet," so you're not making that call from scratch, exhausted, at 11pm after your fortieth message of the week.</p>
      <p>In LitterDesk, you add each inquiry to one buyer list with a status and notes, so you can see who you're talking to without trying to remember.</p>
    `,
  },
  {
    slug: 'what-belongs-in-a-puppy-contract',
    title: 'What Belongs in a Puppy Contract',
    category: 'Contracts',
    phase: 'Contracts',
    excerpt: 'Health guarantees, spay/neuter terms, and return policy — the clauses that protect you.',
    bodyHtml: `
      <p>A lot of breeder contracts are really just a bill of sale with a health guarantee bolted on. That's something, but it isn't protection. It looks official and does very little the day something goes wrong.</p>
      <p>Here's what a contract needs to hold up, and why each piece matters.</p>
      <h3>The health guarantee needs specifics, not vibes</h3>
      <p>"Guaranteed against genetic defects" sounds like a health guarantee but isn't one. A real guarantee spells out:</p>
      <ul>
        <li>What's covered (genetic vs. congenital vs. general health), and for how long</li>
        <li>What documentation the buyer needs to provide, and by when, if something comes up</li>
        <li>What the remedy actually is — replacement puppy, refund, partial refund — and under what conditions</li>
        <li>Who's responsible for veterinary costs during the claim process</li>
      </ul>
      <p>Vague guarantees don't protect buyers <em>or</em> breeders. They just create disagreements later, when everyone's already upset.</p>
      <h3>Spay/neuter terms, written down, with a deadline</h3>
      <p>If you require spay or neuter — for a pet-quality puppy, for co-ownership, for anything — the contract needs an actual timeframe and a way to verify it happened, not just a verbal "we'll expect that eventually." Breeders who skip this are the ones who find out two years later that nothing happened, with no real recourse because nothing was ever in writing.</p>
      <h3>The return clause is the one everyone skips, and shouldn't</h3>
      <p>This is the clause that matters most and gets written least carefully: what happens if the buyer can't keep the dog — in six months, or six years. A contract that says "buyer agrees to return the dog to breeder rather than rehome or surrender to a shelter" is doing real work. It's the difference between one of your dogs ending up back with you, versus ending up in a shelter with no way for you to even find out.</p>
      <h3>Deposit terms: refundable, non-refundable, and under what conditions</h3>
      <p>This is the single most disputed clause in breeder contracts, and it's disputed because it's so often left ambiguous. Spell out, explicitly:</p>
      <ul>
        <li>Is the deposit refundable, and if so, under what circumstances (litter doesn't happen, buyer isn't selected, etc.)</li>
        <li>What happens if the <em>buyer</em> backs out — do they forfeit it, get partial credit, nothing?</li>
        <li>What happens if the <em>breeder</em> can't deliver — health issue in the litter, no puppies of the requested sex/color, etc.</li>
      </ul>
      <p>If you can't answer these three questions instantly and confidently, your current contract probably doesn't either.</p>
      <h3>Signatures matter more than people think</h3>
      <p>A contract that lives in someone's email as a Word doc attachment, never actually signed, is barely better than a verbal agreement. If a dispute ever escalates, "we both understood it that way" is a much weaker position than a signed, dated, timestamped document both sides agreed to.</p>
      <h3>You don't need twelve pages</h3>
      <p>You need the handful of clauses above, written specifically enough that there's no room for "well, I thought it meant..." six months from now. Most disputes start because something was assumed instead of written down, not because anyone acted in bad faith.</p>
      <p><em>This is general information, not legal advice. Have a local attorney review your final contract.</em></p>
      <p>LitterDesk sends the contract for online signing, so it is signed before a puppy changes hands, not after.</p>
    `,
  },
  {
    slug: 'go-home-checklist',
    title: 'The Go-Home Checklist Every Serious Breeder Should Have',
    category: 'Buyer Follow-Through',
    phase: 'Go-home',
    excerpt: 'What to send, when to follow up, and why go-home day is the start of the relationship, not the end.',
    bodyHtml: `
      <p>Go-home day gets treated like the finish line. It's actually the start of the part of the relationship most likely to determine whether that buyer ever refers a friend, leaves you a review, or comes back for their next dog — or goes quiet and disappears the moment the puppy's in the car.</p>
      <p>Here's what needs to happen, in order.</p>
      <h3>Before go-home day: the paperwork should already be done</h3>
      <p>If you're printing health records or finishing the contract the morning a buyer arrives, you're doing go-home day under stress that's entirely avoidable. By this point, weeks earlier, you should already have:</p>
      <ul>
        <li>Signed contract on file</li>
        <li>Deposit and remaining balance reconciled</li>
        <li>Health records, vaccination history, and any genetic testing results ready to hand over</li>
        <li>Registration paperwork started, if applicable</li>
      </ul>
      <p>None of this should be a go-home-day scramble. It should be a five-minute handoff of things that were finished long before.</p>
      <h3>The health record packet buyers actually need</h3>
      <p>A single vaccination card is not a health record packet. Buyers — especially first-time owners — need something they can hand directly to their vet on day one:</p>
      <ul>
        <li>Full vaccination and deworming history, with dates</li>
        <li>Any veterinary visits or treatments during the puppy's time with you</li>
        <li>Diet — what they've been eating, how much, how often, so the transition doesn't upset their stomach</li>
        <li>Any genetic testing results relevant to the breed</li>
      </ul>
      <p>Sending this digitally <em>and</em> on paper covers both the buyer who'll lose the paper copy in a week and the vet's office that still wants something physical.</p>
      <h3>The follow-up cadence that actually gets used</h3>
      <p>Most breeders mean to follow up and don't, not because they don't care, but because there's no system reminding them to. A simple cadence works:</p>
      <ul>
        <li><strong>48 hours after go-home:</strong> a short check-in — how's the first night going, any questions</li>
        <li><strong>1 week:</strong> how's the transition, any behavior or health concerns</li>
        <li><strong>1 month:</strong> a genuine "how's it going" — this is often when small issues surface that are easy to fix early and hard to fix late</li>
      </ul>
      <p>This is also, not coincidentally, when most referrals and reviews get generated — buyers who feel looked after after the sale are the ones who talk about you to their friends.</p>
      <h3>Don't let the relationship just end</h3>
      <p>The breeders buyers rave about aren't the ones with the fanciest litter announcements. They're the ones who followed up, answered the 2am "is this normal" text without judgment, and made it clear the relationship didn't end at the transaction. Built into how you already operate, that isn't extra work. It's the difference between a breeder buyers use once and one they come back to.</p>
      <p>LitterDesk keeps go-home dates, health records and follow-up reminders in one place, so none of it relies on memory.</p>
    `,
  },
]
