(impl-trait .trait-ownable.ownable-trait)
(impl-trait .trait-pool-token.pool-token-trait)

(define-fungible-token t-alex)

(define-data-var token-uri (string-utf8 256) u"")
(define-data-var CONTRACT-OWNER principal tx-sender)
(define-map approved-contracts principal bool)

;; errors
(define-constant ERR-NOT-AUTHORIZED (err u1000))

(define-read-only (get-owner)
  (ok (var-get CONTRACT-OWNER))
)

(define-public (set-owner (owner principal))
  (begin
    (asserts! (is-eq contract-caller (var-get CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
    (ok (var-set CONTRACT-OWNER owner))
  )
)

(define-private (check-is-approved (sender principal))
  (ok (asserts! (or (default-to false (map-get? approved-contracts sender)) (is-eq sender (var-get CONTRACT-OWNER))) ERR-NOT-AUTHORIZED))
)

;; ---------------------------------------------------------
;; SIP-10 Functions
;; ---------------------------------------------------------

(define-read-only (get-total-supply)
  (ok (decimals-to-fixed (ft-get-supply t-alex)))
)

(define-read-only (get-name)
  (ok "t-alex")
)

(define-read-only (get-symbol)
  (ok "t-alex")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-balance (account principal))
  (ok (decimals-to-fixed (ft-get-balance t-alex account)))
)

(define-public (set-token-uri (value (string-utf8 256)))
  (begin
    (asserts! (is-eq contract-caller (var-get CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
    (ok (var-set token-uri value))
  )
)

(define-read-only (get-token-uri)
  (ok (some (var-get token-uri)))
)

(define-constant ONE_8 (pow u10 u8))

(define-private (pow-decimals)
  (pow u10 (unwrap-panic (get-decimals)))
)

(define-read-only (fixed-to-decimals (amount uint))
  (/ (* amount (pow-decimals)) ONE_8)
)

(define-private (decimals-to-fixed (amount uint))
  (/ (* amount ONE_8) (pow-decimals))
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq sender tx-sender) ERR-NOT-AUTHORIZED)
    (match (ft-transfer? t-alex (fixed-to-decimals amount) sender recipient)
      response (begin
        (print memo)
        (ok response)
      )
      error (err error)
    )
  )
)

(define-public (mint (recipient principal) (amount uint))
  (begin
    (try! (check-is-approved contract-caller))
    (ft-mint? t-alex (fixed-to-decimals amount) recipient)
  )
)

(define-public (burn (sender principal) (amount uint))
  (begin
    (try! (check-is-approved contract-caller))
    (ft-burn? t-alex (fixed-to-decimals amount) sender)
  )
)

(define-public (add-approved-contract (new-approved-contract principal))
  (begin
    (asserts! (is-eq contract-caller (var-get CONTRACT-OWNER)) ERR-NOT-AUTHORIZED)
    (map-set approved-contracts new-approved-contract true)
    (ok true)
  )
)

(begin
  (map-set approved-contracts .alex-reserve-pool true)  
  (map-set approved-contracts .faucet true)
)

;; Initialize the contract for Testing.
(begin
  (try! (ft-mint? t-alex u100000000000000000 tx-sender))  
)


