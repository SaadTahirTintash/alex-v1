(impl-trait .trait-ownable.ownable-trait)
(use-trait ft-trait .trait-sip-010.sip-010-trait)

;; alex-reserve-pool

(define-constant ERR-INVALID-POOL-ERR (err u2001))
(define-constant ERR-NO-LIQUIDITY (err u2002))
(define-constant ERR-INVALID-LIQUIDITY (err u2003))
(define-constant ERR-TRANSFER-X-FAILED (err u3001))
(define-constant ERR-TRANSFER-Y-FAILED (err u3002))
(define-constant ERR-POOL-ALREADY-EXISTS (err u2000))
(define-constant ERR-TOO-MANY-POOLS (err u2004))
(define-constant ERR-PERCENT_GREATER_THAN_ONE (err u5000))
(define-constant ERR-NO-FEE (err u2005))
(define-constant ERR-NO-FEE-Y (err u2006))
(define-constant ERR-WEIGHTED-EQUATION-CALL (err u2009))
(define-constant ERR-MATH-CALL (err u2010))
(define-constant ERR-INTERNAL-FUNCTION-CALL (err u1001))
(define-constant ERR-GET-WEIGHT-FAIL (err u2012))
(define-constant ERR-GET-EXPIRY-FAIL-ERR (err u2013))
(define-constant ERR-GET-PRICE-FAIL (err u2015))
(define-constant ERR-GET-SYMBOL-FAIL (err u6000))
(define-constant ERR-GET-ORACLE-PRICE-FAIL (err u7000))
(define-constant ERR-EXPIRY (err u2017))
(define-constant ERR-GET-BALANCE-FAIL (err u6001))
(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-TRANSFER-FAILED (err u3000))
(define-constant ERR_USER_ALREADY_REGISTERED (err u10001))
(define-constant ERR_USER_NOT_FOUND (err u10002))
(define-constant ERR_USER_ID_NOT_FOUND (err u10003))
(define-constant ERR_ACTIVATION_THRESHOLD_REACHED (err u10004))
(define-constant ERR_UNABLE_TO_SET_THRESHOLD (err u10021))
(define-constant ERR_CONTRACT_NOT_ACTIVATED (err u10005))
(define-constant ERR_STAKING_NOT_AVAILABLE (err u10015))
(define-constant ERR_CANNOT_STAKE (err u10016))
(define-constant ERR_REWARD_CYCLE_NOT_COMPLETED (err u10017))
(define-constant ERR_NOTHING_TO_REDEEM (err u10018))

(define-constant ONE_8 (pow u10 u8)) ;; 8 decimal places


(define-data-var oracle-src (string-ascii 32) "coingecko")

(define-data-var contract-owner principal tx-sender)

(define-data-var activation-block uint u0)
(define-data-var activation-delay uint u150)
(define-data-var activation-reached bool false)
(define-data-var activation-threshold uint u20)
(define-data-var users-nonce uint u0)

(define-map approved-contracts principal bool)
;; store user principal by user id
(define-map users uint principal)
;; store user id by user principal
(define-map user-ids principal uint)

;; returns Stacks block height registration was activated at plus activationDelay
(define-read-only (get-activation-block)
  (begin
    (asserts! (var-get activation-reached) ERR_CONTRACT_NOT_ACTIVATED)
    (ok (var-get activation-block))
  )
)

;; returns activation delay
(define-read-only (get-activation-delay)
  (var-get activation-delay)
)

;; returns activation status as boolean
(define-read-only (get-activation-status)
  (var-get activation-reached)
)

;; returns activation threshold
(define-read-only (get-activation-threshold)
  (var-get activation-threshold)
)

(define-public (set-activation-block (new-activation-block uint))
  (begin
    (asserts! (is-eq contract-caller (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (var-set activation-block new-activation-block)
    (ok true)
  )
)

(define-read-only (get-owner)
  (ok (var-get contract-owner))
)

(define-public (set-owner (owner principal))
  (begin
    (asserts! (is-eq contract-caller (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (ok (var-set contract-owner owner))
  )
)

(define-read-only (get-oracle-src)
  (ok (var-get oracle-src))
)

(define-public (set-oracle-src (new-oracle-src (string-ascii 32)))
  (begin
    (asserts! (is-eq contract-caller (var-get contract-owner)) ERR-NOT-AUTHORIZED)
    (ok (var-set oracle-src new-oracle-src))
  )
)

;; if sender is an approved contract, then transfer requested amount :qfrom vault to recipient
(define-public (transfer-ft (token <ft-trait>) (amount uint) (sender principal) (recipient principal))
  (begin     
    (asserts! (default-to false (map-get? approved-contracts sender)) ERR-NOT-AUTHORIZED)
    (as-contract (unwrap! (contract-call? token transfer amount tx-sender recipient none) ERR-TRANSFER-FAILED))
    (ok true)
  )
)

;; returns (some user-id) or none
(define-read-only (get-user-id (user principal))
  (map-get? user-ids user)
)

;; returns (some user-principal) or none
(define-read-only (get-user (user-id uint))
  (map-get? users user-id)
)

;; returns number of registered users, used for activation and tracking user IDs
(define-read-only (get-registered-users-nonce)
  (var-get users-nonce)
)

;; returns user ID if it has been created, or creates and returns new ID
(define-private (get-or-create-user-id (user principal))
  (match
    (map-get? user-ids user)
    value value
    (let
      (
        (new-id (+ u1 (var-get users-nonce)))
      )
      (map-set users new-id user)
      (map-set user-ids user new-id)
      (var-set users-nonce new-id)
      new-id
    )
  )
)

;; registers users that signal activation of contract until threshold is met
(define-public (register-user (memo (optional (string-utf8 50))))
  (let
    (
      (new-id (+ u1 (var-get users-nonce)))
      (threshold (var-get activation-threshold))
    )
    (asserts! (is-none (map-get? user-ids tx-sender)) ERR_USER_ALREADY_REGISTERED)
    (asserts! (<= new-id threshold) ERR_ACTIVATION_THRESHOLD_REACHED)

    (if (is-some memo) (print memo) none)

    (get-or-create-user-id tx-sender)

    (if (is-eq new-id threshold)
      (let
        (
          (activation-block-val (+ block-height (var-get activation-delay)))
        )
        (var-set activation-reached true)
        (var-set activation-block activation-block-val)
        (unwrap! (set-coinbase-thresholds activation-block-val) ERR_UNABLE_TO_SET_THRESHOLD)
        (ok true)
      )
      (ok true)
    )
  )
)

;; staking CONFIGURATION

(define-constant MAX_REWARD_CYCLES u32)
(define-constant REWARD_CYCLE_INDEXES (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20 u21 u22 u23 u24 u25 u26 u27 u28 u29 u30 u31))

;; how long a reward cycle is
(define-data-var reward-cycle-length uint u2100)

;; At a given reward cycle, what is the total amount of tokens staked
(define-map staking-stats-at-cycle uint uint)

;; returns the total stacked tokens and committed uSTX for a given reward cycle
(define-read-only (get-staking-stats-at-cycle (reward-cycle uint))
  (map-get? staking-stats-at-cycle reward-cycle)
)

;; returns the total stacked tokens and committed uSTX for a given reward cycle
;; or, an empty structure
(define-read-only (get-staking-stats-at-cycle-or-default (reward-cycle uint))
  (default-to u0 (map-get? staking-stats-at-cycle reward-cycle))
)

;; At a given reward cycle and user ID:
;; - what is the total tokens Stacked?
;; - how many tokens should be returned? (based on staking period)
(define-map staker-at-cycle
  {
    reward-cycle: uint,
    user-id: uint
  }
  {
    amount-staked: uint,
    to-return: uint
  }
)

(define-read-only (get-staker-at-cycle (reward-cycle uint) (user-id uint))
  (map-get? staker-at-cycle { reward-cycle: reward-cycle, user-id: user-id })
)

(define-read-only (get-staker-at-cycle-or-default (reward-cycle uint) (user-id uint))
  (default-to { amount-staked: u0, to-return: u0 }
    (map-get? staker-at-cycle { reward-cycle: reward-cycle, user-id: user-id }))
)

;; get the reward cycle for a given Stacks block height
(define-read-only (get-reward-cycle (stacks-height uint))
  (let
    (
      (first-staking-block (var-get activation-block))
      (rcLen (var-get reward-cycle-length))
    )
    (if (>= stacks-height first-staking-block)
      (some (/ (- stacks-height first-staking-block) rcLen))
      none)
  )
)

;; determine if staking is active in a given cycle
(define-read-only (staking-active-at-cycle (reward-cycle uint))
  (is-some (map-get? staking-stats-at-cycle reward-cycle))
)

;; get the first Stacks block height for a given reward cycle.
(define-read-only (get-first-stacks-block-in-reward-cycle (reward-cycle uint))
  (+ (var-get activation-block) (* (var-get reward-cycle-length) reward-cycle))
)

;; getter for get-entitled-staking-reward that specifies block height
(define-read-only (get-staking-reward (user-id uint) (target-cycle uint))
  (get-entitled-staking-reward user-id target-cycle block-height)
)

;; get uSTX a staker can claim, given reward cycle they stacked in and current block height
;; this method only returns a positive value if:
;; - the current block height is in a subsequent reward cycle
;; - the staker actually locked up tokens in the target reward cycle
;; - the staker locked up _enough_ tokens to get at least one uSTX
;; it is possible to Stack tokens and not receive uSTX:
;; - if no miners commit during this reward cycle
;; - the amount stacked by user is too few that you'd be entitled to less than 1 uSTX
(define-private (get-entitled-staking-reward (user-id uint) (target-cycle uint) (stacks-height uint))
  (let
    (
      (total-staked-this-cycle (get-staking-stats-at-cycle-or-default target-cycle))
      (user-staked-this-cycle (get amount-staked (get-staker-at-cycle-or-default target-cycle user-id)))
    )
    (match (get-reward-cycle stacks-height)
      current-cycle
      (if (or (<= current-cycle target-cycle) (is-eq u0 user-staked-this-cycle))
        ;; this cycle hasn't finished, or staker contributed nothing
        u0
        (/ user-staked-this-cycle total-staked-this-cycle)
      )
      ;; before first reward cycle
      u0
    )
  )
)

;; staking ACTIONS

(define-public (stake-tokens (amount-token uint) (lock-period uint))
  (stake-tokens-at-cycle tx-sender (get-or-create-user-id tx-sender) amount-token block-height lock-period)
)

(define-private (stake-tokens-at-cycle (user principal) (user-id uint) (amount-token uint) (start-height uint) (lock-period uint))
  (let
    (
      (current-cycle (unwrap! (get-reward-cycle start-height) ERR_STAKING_NOT_AVAILABLE))
      (target-cycle (+ u1 current-cycle))
      (commitment {
        staker-id: user-id,
        amount: amount-token,
        first: target-cycle,
        last: (+ target-cycle lock-period)
      })
    )
    (asserts! (get-activation-status) ERR_CONTRACT_NOT_ACTIVATED)
    (asserts! (and (> lock-period u0) (<= lock-period MAX_REWARD_CYCLES)) ERR_CANNOT_STAKE)
    (asserts! (> amount-token u0) ERR_CANNOT_STAKE)
    (try! (contract-call? .token-alex transfer amount-token tx-sender (as-contract tx-sender) none))
    (match (fold stake-tokens-closure REWARD_CYCLE_INDEXES (ok commitment))
      ok-value (ok true)
      err-value (err err-value)
    )
  )
)

(define-private (stake-tokens-closure (reward-cycle-idx uint)
  (commitment-response (response 
    {
      staker-id: uint,
      amount: uint,
      first: uint,
      last: uint
    }
    uint
  )))

  (match commitment-response
    commitment 
    (let
      (
        (staker-id (get staker-id commitment))
        (amount-token (get amount commitment))
        (first-cycle (get first commitment))
        (last-cycle (get last commitment))
        (target-cycle (+ first-cycle reward-cycle-idx))
        (this-staker-at-cycle (get-staker-at-cycle-or-default target-cycle staker-id))
        (amount-staked (get amount-staked this-staker-at-cycle))
        (to-return (get to-return this-staker-at-cycle))
      )
      (begin
        (if (and (>= target-cycle first-cycle) (< target-cycle last-cycle))
          (begin
            (if (is-eq target-cycle (- last-cycle u1))
              (set-tokens-staked staker-id target-cycle amount-token amount-token)
              (set-tokens-staked staker-id target-cycle amount-token u0)
            )
            true
          )
          false
        )
        commitment-response
      )
    )
    err-value commitment-response
  )
)

(define-private (set-tokens-staked (user-id uint) (target-cycle uint) (amount-staked uint) (to-return uint))
  (let
    (
      (this-staker-at-cycle (get-staker-at-cycle-or-default target-cycle user-id))
    )
    (map-set staking-stats-at-cycle target-cycle (+ amount-staked (get-staking-stats-at-cycle-or-default target-cycle)))
    (map-set staker-at-cycle
      {
        reward-cycle: target-cycle,
        user-id: user-id
      }
      {
        amount-staked: (+ amount-staked (get amount-staked this-staker-at-cycle)),
        to-return: (+ to-return (get to-return this-staker-at-cycle))
      }
    )
  )
)

;; staking REWARD CLAIMS

;; calls function to claim staking reward in active logic contract
(define-public (claim-staking-reward (target-cycle uint))
  (begin
    (try! (claim-staking-reward-at-cycle tx-sender block-height target-cycle))
    (ok true)
  )
)

(define-private (claim-staking-reward-at-cycle (user principal) (stacks-height uint) (target-cycle uint))
  (let
    (
      (current-cycle (unwrap! (get-reward-cycle stacks-height) ERR_STAKING_NOT_AVAILABLE))
      (user-id (unwrap! (get-user-id user) ERR_USER_ID_NOT_FOUND))
      (entitled-token (get-entitled-staking-reward user-id target-cycle stacks-height))
      (to-return (get to-return (get-staker-at-cycle-or-default target-cycle user-id)))
    )
    (asserts! (> current-cycle target-cycle) ERR_REWARD_CYCLE_NOT_COMPLETED)
    (asserts! (or (> to-return u0) (> entitled-token u0)) ERR_NOTHING_TO_REDEEM)
    ;; disable ability to claim again
    (map-set staker-at-cycle
      {
        reward-cycle: target-cycle,
        user-id: user-id
      }
      {
        amount-staked: u0,
        to-return: u0
      }
    )
    ;; send back tokens if user was eligible
    (and (> to-return u0) (try! (as-contract (contract-call? .token-alex transfer to-return tx-sender user none))))
    ;; send back rewards if user was eligible
    (and (> entitled-token u0) (try! (as-contract (contract-call? .token-alex transfer entitled-token tx-sender user none))))
    (ok true)
  )
)

;; TOKEN CONFIGURATION

(define-constant TOKEN_HALVING_BLOCKS u210000)

;; store block height at each halving, set by register-user in core contract
(define-data-var coinbase-threshold-1 uint u0)
(define-data-var coinbase-threshold-2 uint u0)
(define-data-var coinbase-threshold-3 uint u0)
(define-data-var coinbase-threshold-4 uint u0)
(define-data-var coinbase-threshold-5 uint u0)

(define-private (set-coinbase-thresholds (activation-block-val uint))
  (begin
    (var-set coinbase-threshold-1 (+ activation-block-val TOKEN_HALVING_BLOCKS))
    (var-set coinbase-threshold-2 (+ activation-block-val (* u2 TOKEN_HALVING_BLOCKS)))
    (var-set coinbase-threshold-3 (+ activation-block-val (* u3 TOKEN_HALVING_BLOCKS)))
    (var-set coinbase-threshold-4 (+ activation-block-val (* u4 TOKEN_HALVING_BLOCKS)))
    (var-set coinbase-threshold-5 (+ activation-block-val (* u5 TOKEN_HALVING_BLOCKS)))
    (ok true)
  )
)
;; return coinbase thresholds if contract activated
(define-read-only (get-coinbase-thresholds)
  (begin
    (asserts! (var-get activation-reached) ERR_CONTRACT_NOT_ACTIVATED)
    (ok {
      coinbase-threshold-1: (var-get coinbase-threshold-1),
      coinbase-threshold-2: (var-get coinbase-threshold-2),
      coinbase-threshold-3: (var-get coinbase-threshold-3),
      coinbase-threshold-4: (var-get coinbase-threshold-4),
      coinbase-threshold-5: (var-get coinbase-threshold-5)
    })
  )
)

;; function for deciding how many tokens to mint, depending on when they were mined
(define-read-only (get-coinbase-amount (stacks-height uint))
  (begin
    ;; if contract is not active, return 0
    (asserts! (>= stacks-height (var-get activation-block)) u0)
    ;; if contract is active, return based on issuance schedule
    ;; halvings occur every 210,000 blocks for 1,050,000 Stacks blocks
    ;; then mining continues indefinitely with 3,125 tokens as the reward
    (asserts! (> stacks-height (var-get coinbase-threshold-1))
      (if (<= (- stacks-height (var-get activation-block)) u10000)
        ;; bonus reward first 10,000 blocks
        u250000
        ;; standard reward remaining 200,000 blocks until 1st halving
        u100000
      )
    )
    ;; computations based on each halving threshold
    (asserts! (> stacks-height (var-get coinbase-threshold-2)) u50000)
    (asserts! (> stacks-height (var-get coinbase-threshold-3)) u25000)
    (asserts! (> stacks-height (var-get coinbase-threshold-4)) u12500)
    (asserts! (> stacks-height (var-get coinbase-threshold-5)) u6250)
    ;; default value after 5th halving
    u3125
  )
)

;; mint new tokens for claimant who won at given Stacks block height
(define-private (mint-coinbase (recipient principal) (stacks-height uint))
  (as-contract (contract-call? .token-alex mint recipient (get-coinbase-amount stacks-height)))
)


;; math-fixed-point
;; Fixed Point Math
;; following https://github.com/balancer-labs/balancer-monorepo/blob/master/pkg/solidity-utils/contracts/math/FixedPoint.sol

;; constants
;;
(define-constant SCALE_UP_OVERFLOW (err u5001))
(define-constant SCALE_DOWN_OVERFLOW (err u5002))
(define-constant ADD_OVERFLOW (err u5003))
(define-constant SUB_OVERFLOW (err u5004))
(define-constant MUL_OVERFLOW (err u5005))
(define-constant DIV_OVERFLOW (err u5006))
(define-constant POW_OVERFLOW (err u5007))

;; With 8 fixed digits you would have a maximum error of 0.5 * 10^-8 in each entry, 
;; which could aggregate to about 8 x 0.5 * 10^-8 = 4 * 10^-8 relative error 
;; (i.e. the last digit of the result may be completely lost to this error).
(define-constant MAX_POW_RELATIVE_ERROR u4) 

;; public functions
;;

(define-read-only (get_one)
    (ok ONE_8)
)

(define-read-only (scale-up (a uint))
  (* a ONE_8)
)

(define-read-only (scale-down (a uint))
  (/ a ONE_8)
)

(define-read-only (mul-down (a uint) (b uint))
  (/ (* a b) ONE_8)
)


(define-read-only (mul-up (a uint) (b uint))
    (let
        (
            (product (* a b))
       )
        (if (is-eq product u0)
            u0
            (+ u1 (/ (- product u1) ONE_8))
       )
   )
)

(define-read-only (div-down (a uint) (b uint))
  (if (is-eq a u0)
    u0
    (/ (* a ONE_8) b)
  )
)

(define-read-only (div-up (a uint) (b uint))
  (if (is-eq a u0)
    u0
    (+ u1 (/ (- (* a ONE_8) u1) b))
  )
)

(define-read-only (pow-down (a uint) (b uint))    
    (let
        (
            (raw (unwrap-panic (pow-fixed a b)))
            (max-error (+ u1 (mul-up raw MAX_POW_RELATIVE_ERROR)))
        )
        (if (< raw max-error)
            u0
            (- raw max-error)
        )
    )
)

(define-read-only (pow-up (a uint) (b uint))
    (let
        (
            (raw (unwrap-panic (pow-fixed a b)))
            (max-error (+ u1 (mul-up raw MAX_POW_RELATIVE_ERROR)))
        )
        (+ raw max-error)
    )
)

;; math-log-exp
;; Exponentiation and logarithm functions for 8 decimal fixed point numbers (both base and exponent/argument).
;; Exponentiation and logarithm with arbitrary bases (x^y and log_x(y)) are implemented by conversion to natural 
;; exponentiation and logarithm (where the base is Euler's number).
;; Reference: https://github.com/balancer-labs/balancer-monorepo/blob/master/pkg/solidity-utils/contracts/math/LogExpMath.sol
;; MODIFIED: because we use only 128 bits instead of 256, we cannot do 20 decimal or 36 decimal accuracy like in Balancer. 

;; constants
;;
;; All fixed point multiplications and divisions are inlined. This means we need to divide by ONE when multiplying
;; two numbers, and multiply by ONE when dividing them.
;; All arguments and return values are 8 decimal fixed point numbers.
(define-constant iONE_8 (pow 10 8))
(define-constant ONE_10 (pow 10 10))

;; The domain of natural exponentiation is bound by the word size and number of decimals used.
;; The largest possible result is (2^127 - 1) / 10^8, 
;; which makes the largest exponent ln((2^127 - 1) / 10^8) = 69.6090111872.
;; The smallest possible result is 10^(-8), which makes largest negative argument ln(10^(-8)) = -18.420680744.
;; We use 69.0 and -18.0 to have some safety margin.
(define-constant MAX_NATURAL_EXPONENT (* 69 iONE_8))
(define-constant MIN_NATURAL_EXPONENT (* -18 iONE_8))

(define-constant MILD_EXPONENT_BOUND (/ (pow u2 u126) (to-uint iONE_8)))

;; Because largest exponent is 69, we start from 64
;; The first several a_n are too large if stored as 8 decimal numbers, and could cause intermediate overflows.
;; Instead we store them as plain integers, with 0 decimals.
(define-constant x_a_list_no_deci (list 
{x_pre: 6400000000, a_pre: 6235149080811616882910000000, use_deci: false} ;; x1 = 2^6, a1 = e^(x1)
))
;; 8 decimal constants
(define-constant x_a_list (list 
{x_pre: 3200000000, a_pre: 7896296018268069516100, use_deci: true} ;; x2 = 2^5, a2 = e^(x2)
{x_pre: 1600000000, a_pre: 888611052050787, use_deci: true} ;; x3 = 2^4, a3 = e^(x3)
{x_pre: 800000000, a_pre: 298095798704, use_deci: true} ;; x4 = 2^3, a4 = e^(x4)
{x_pre: 400000000, a_pre: 5459815003, use_deci: true} ;; x5 = 2^2, a5 = e^(x5)
{x_pre: 200000000, a_pre: 738905610, use_deci: true} ;; x6 = 2^1, a6 = e^(x6)
{x_pre: 100000000, a_pre: 271828183, use_deci: true} ;; x7 = 2^0, a7 = e^(x7)
{x_pre: 50000000, a_pre: 164872127, use_deci: true} ;; x8 = 2^-1, a8 = e^(x8)
{x_pre: 25000000, a_pre: 128402542, use_deci: true} ;; x9 = 2^-2, a9 = e^(x9)
{x_pre: 12500000, a_pre: 113314845, use_deci: true} ;; x10 = 2^-3, a10 = e^(x10)
{x_pre: 6250000, a_pre: 106449446, use_deci: true} ;; x11 = 2^-4, a11 = e^x(11)
))

(define-constant X_OUT_OF_BOUNDS (err u5009))
(define-constant Y_OUT_OF_BOUNDS (err u5010))
(define-constant PRODUCT_OUT_OF_BOUNDS (err u5011))
(define-constant INVALID_EXPONENT (err u5012))
(define-constant OUT_OF_BOUNDS (err u5013))

;; private functions
;;

;; Internal natural logarithm (ln(a)) with signed 8 decimal fixed point argument.
(define-private (ln-priv (a int))
  (let
    (
      (a_sum_no_deci (fold accumulate_division x_a_list_no_deci {a: a, sum: 0}))
      (a_sum (fold accumulate_division x_a_list {a: (get a a_sum_no_deci), sum: (get sum a_sum_no_deci)}))
      (out_a (get a a_sum))
      (out_sum (get sum a_sum))
      (z (/ (* (- out_a iONE_8) iONE_8) (+ out_a iONE_8)))
      (z_squared (/ (* z z) iONE_8))
      (div_list (list 3 5 7 9 11))
      (num_sum_zsq (fold rolling_sum_div div_list {num: z, seriesSum: z, z_squared: z_squared}))
      (seriesSum (get seriesSum num_sum_zsq))
      (r (+ out_sum (* seriesSum 2)))
   )
    (ok r)
 )
)

(define-private (accumulate_division (x_a_pre (tuple (x_pre int) (a_pre int) (use_deci bool))) (rolling_a_sum (tuple (a int) (sum int))))
  (let
    (
      (a_pre (get a_pre x_a_pre))
      (x_pre (get x_pre x_a_pre))
      (use_deci (get use_deci x_a_pre))
      (rolling_a (get a rolling_a_sum))
      (rolling_sum (get sum rolling_a_sum))
   )
    (if (>= rolling_a (if use_deci a_pre (* a_pre iONE_8)))
      {a: (/ (* rolling_a (if use_deci iONE_8 1)) a_pre), sum: (+ rolling_sum x_pre)}
      {a: rolling_a, sum: rolling_sum}
   )
 )
)

(define-private (rolling_sum_div (n int) (rolling (tuple (num int) (seriesSum int) (z_squared int))))
  (let
    (
      (rolling_num (get num rolling))
      (rolling_sum (get seriesSum rolling))
      (z_squared (get z_squared rolling))
      (next_num (/ (* rolling_num z_squared) iONE_8))
      (next_sum (+ rolling_sum (/ next_num n)))
   )
    {num: next_num, seriesSum: next_sum, z_squared: z_squared}
 )
)

;; Instead of computing x^y directly, we instead rely on the properties of logarithms and exponentiation to
;; arrive at that result. In particular, exp(ln(x)) = x, and ln(x^y) = y * ln(x). This means
;; x^y = exp(y * ln(x)).
;; Reverts if ln(x) * y is smaller than `MIN_NATURAL_EXPONENT`, or larger than `MAX_NATURAL_EXPONENT`.
(define-private (pow-priv (x uint) (y uint))
  (let
    (
      (x-int (to-int x))
      (y-int (to-int y))
      (lnx (unwrap-panic (ln-priv x-int)))
      (logx-times-y (/ (* lnx y-int) iONE_8))
    )
    (asserts! (and (<= MIN_NATURAL_EXPONENT logx-times-y) (<= logx-times-y MAX_NATURAL_EXPONENT)) PRODUCT_OUT_OF_BOUNDS)
    (ok (to-uint (unwrap-panic (exp-fixed logx-times-y))))
  )
)

(define-private (exp-pos (x int))
  (begin
    (asserts! (and (<= 0 x) (<= x MAX_NATURAL_EXPONENT)) (err INVALID_EXPONENT))
    (let
      (
        ;; For each x_n, we test if that term is present in the decomposition (if x is larger than it), and if so deduct
        ;; it and compute the accumulated product.
        (x_product_no_deci (fold accumulate_product x_a_list_no_deci {x: x, product: 1}))
        (x_adj (get x x_product_no_deci))
        (firstAN (get product x_product_no_deci))
        (x_product (fold accumulate_product x_a_list {x: x_adj, product: iONE_8}))
        (product_out (get product x_product))
        (x_out (get x x_product))
        (seriesSum (+ iONE_8 x_out))
        (div_list (list 2 3 4 5 6 7 8 9 10 11 12))
        (term_sum_x (fold rolling_div_sum div_list {term: x_out, seriesSum: seriesSum, x: x_out}))
        (sum (get seriesSum term_sum_x))
     )
      (ok (* (/ (* product_out sum) iONE_8) firstAN))
   )
 )
)

(define-private (accumulate_product (x_a_pre (tuple (x_pre int) (a_pre int) (use_deci bool))) (rolling_x_p (tuple (x int) (product int))))
  (let
    (
      (x_pre (get x_pre x_a_pre))
      (a_pre (get a_pre x_a_pre))
      (use_deci (get use_deci x_a_pre))
      (rolling_x (get x rolling_x_p))
      (rolling_product (get product rolling_x_p))
   )
    (if (>= rolling_x x_pre)
      {x: (- rolling_x x_pre), product: (/ (* rolling_product a_pre) (if use_deci iONE_8 1))}
      {x: rolling_x, product: rolling_product}
   )
 )
)

(define-private (rolling_div_sum (n int) (rolling (tuple (term int) (seriesSum int) (x int))))
  (let
    (
      (rolling_term (get term rolling))
      (rolling_sum (get seriesSum rolling))
      (x (get x rolling))
      (next_term (/ (/ (* rolling_term x) iONE_8) n))
      (next_sum (+ rolling_sum next_term))
   )
    {term: next_term, seriesSum: next_sum, x: x}
 )
)

;; public functions
;;

(define-read-only (get-exp-bound)
  (ok MILD_EXPONENT_BOUND)
)

;; Exponentiation (x^y) with unsigned 8 decimal fixed point base and exponent.
(define-read-only (pow-fixed (x uint) (y uint))
  (begin
    ;; The ln function takes a signed value, so we need to make sure x fits in the signed 128 bit range.
    (asserts! (< x (pow u2 u127)) X_OUT_OF_BOUNDS)

    ;; This prevents y * ln(x) from overflowing, and at the same time guarantees y fits in the signed 128 bit range.
    (asserts! (< y MILD_EXPONENT_BOUND) Y_OUT_OF_BOUNDS)

    (if (is-eq y u0) 
      (ok (to-uint iONE_8))
      (if (is-eq x u0) 
        (ok u0)
        (pow-priv x y)
      )
    )
  )
)

;; Natural exponentiation (e^x) with signed 8 decimal fixed point exponent.
;; Reverts if `x` is smaller than MIN_NATURAL_EXPONENT, or larger than `MAX_NATURAL_EXPONENT`.
(define-read-only (exp-fixed (x int))
  (begin
    (asserts! (and (<= MIN_NATURAL_EXPONENT x) (<= x MAX_NATURAL_EXPONENT)) (err INVALID_EXPONENT))
    (if (< x 0)
      ;; We only handle positive exponents: e^(-x) is computed as 1 / e^x. We can safely make x positive since it
      ;; fits in the signed 128 bit range (as it is larger than MIN_NATURAL_EXPONENT).
      ;; Fixed point division requires multiplying by iONE_8.
      (ok (/ (* iONE_8 iONE_8) (unwrap-panic (exp-pos (* -1 x)))))
      (exp-pos x)
    )
  )
)

;; Logarithm (log(arg, base), with signed 8 decimal fixed point base and argument.
(define-read-only (log-fixed (arg int) (base int))
  ;; This performs a simple base change: log(arg, base) = ln(arg) / ln(base).
  (let
    (
      (logBase (* (unwrap-panic (ln-priv base)) iONE_8))
      (logArg (* (unwrap-panic (ln-priv arg)) iONE_8))
   )
    (ok (/ (* logArg iONE_8) logBase))
 )
)

;; Natural logarithm (ln(a)) with signed 8 decimal fixed point argument.
(define-read-only (ln-fixed (a int))
  (begin
    (asserts! (> a 0) (err OUT_OF_BOUNDS))
    (if (< a iONE_8)
      ;; Since ln(a^k) = k * ln(a), we can compute ln(a) as ln(a) = ln((1/a)^(-1)) = - ln((1/a)).
      ;; If a is less than one, 1/a will be greater than one.
      ;; Fixed point division requires multiplying by iONE_8.
      (ok (- 0 (unwrap-panic (ln-priv (/ (* iONE_8 iONE_8) a)))))
      (ln-priv a)
   )
 )
)

;; contract initialisation
(begin
  (map-set approved-contracts .collateral-rebalancing-pool true)  
)
