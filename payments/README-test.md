# Ai2 Payment-Testmodus

`node payments/test.js` erzeugt ausschließlich lokale Testdaten in `data/payments.json`.

Getestet werden damit die Darstellung von:
- bezahlter Plus-Zahlung (€9,99)
- aktivem Plus-Abo
- Refund erfolgreich
- PaymentIntent-/Customer-/Subscription-Referenzen
- Zahlungs-/Audit-Log

Die Testdaten sind mit `test: true` markiert und verwenden keine Stripe-Schlüssel und kein echtes Geld.

Für einen echten Stripe-Test müssen die Stripe-Test-Schlüssel (`sk_test_...`) und Test-Price-IDs nur lokal bzw. als Server-Secrets gesetzt werden. Niemals Secrets in Git committen.
