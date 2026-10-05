# Cards, invoices and installments (MDL8)

A managed card has exactly one owned, same-currency `credit` financial account.
Purchases create EXPENSE ledger transactions; payments create incoming TRANSFERs.
Payment never creates another expense. There is no secondary balance/payment ledger.

Installments are exact integer minor units, with the remainder in the last
installment. Each installment must be positive (the total must be at least the
installment count in minor units). Monthly dates retain the original day anchor
and clamp only the current month. Dates are local to the profile timezone (UTC
fallback); PostgreSQL converts the local date to a checked timestamptz.

Billing rules are immutable half-open versions. A charge on the closing date
belongs to that closing; due is the first configured day strictly after closing.
Real issuers may have different intraday cutoffs. Future rule changes affect
future charge dates, never a closed invoice.

Invoices are derived read models keyed by card and closing date. Recognized
charges and future scheduled charges are separate. Uncancelled incoming transfers
are allocated to legacy liability first, then recognized invoices by due date
and closing date. Excess remains unallocated credit until charges are recognized.
Legacy opening balance is displayed separately; no historical invoice is invented.
Linking an existing account requires the tracking boundary to follow its unmanaged
charges/outgoing transfers; prior rows remain unchanged. Incoming credits/payments
remain usable. The API returns a conflict rather than inventing managed invoices.

Current Net Worth uses only the existing recognized account balance. Future
installments are commitments, not current liabilities. No extra net-worth item
is created. Budget and summary see each installment as an expense in its local
scheduled month; transfers do not increase expenses. Yield and recurrences are
not written. Calendar integration is deferred to avoid changing the MDL5 contract;
Cards exposes closing/due dates directly.

Estimated used limit is max(-real balance + future installments, 0); available
limit may be negative, never higher than the configured limit. Exceeding it is
informational and does not reject a purchase. Currencies never mix; no FX.

Cancellation is a correction, not a refund: retain the purchase/installments and
cancel linked transactions atomically. Applied payments make cancellation unsafe
and are rejected. Archive is terminal, preserves future installments/history,
allows payments and does not deactivate the backing account.

The private app schema uses ownership RLS and compound FKs. Only the backend
materializes installments and closes rule versions. Generic transactions and
outgoing transfers cannot bypass managed-card accounting. PAN, CVV, PIN, banking
credentials and payment tokens are not accepted or stored. There is no payment
processing, interest, revolving debt, refund engine or paid external service.
