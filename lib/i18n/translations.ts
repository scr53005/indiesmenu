// Indies UI strings (R2 of INDIESMENU-REFACTOR-PLAN.md). French is the source: every key
// exists in `fr`; `en` and `lb` are filled in R5, and until then a missing entry falls back
// to French (translate.ts). Keys are grouped by the overlay that uses them.
//
// Some banners are bilingual on screen today (a French line, then an English one). Their English
// line is its own key ending in `En`, so R2 changes no visible text; R5 replaces each pair with
// one key shown in the customer's language.
//
// Placeholders: `{name}`. A test checks every language uses the same placeholders as French.

const fr = {
  'common.ok': 'OK',
  'common.dismiss': 'Fermer',

  // Cart order button
  'order.button': 'Commandez',
  'order.balanceCooldown': 'Solde... {seconds}s',
  'order.redirecting': 'Veuillez patienter… {seconds}s',

  // Payment progress (yellow) and transmission error (grey)
  'payment.success': 'Paiement réussi!',
  'payment.transmitting': 'Commande en cours de transmission...',
  'payment.transmissionError': "Une erreur de transmission s'est produite",
  'payment.callWaiterApology': 'Veuillez appeler un serveur et nous en excuser',
  'payment.showOrder': 'Commande',
  'payment.clearOrder': 'Effacer',
  'payment.accountCreatedPaid': 'Compte créé! Paiement réussi!',
  // Grey error banner (PaymentErrorBanner)
  'payment.credentialsFailed': "Paiement reçu, mais votre portefeuille n'a pas pu être chargé. Rechargez la page pour réessayer.",
  'payment.connectionError': 'Connexion impossible. Vérifiez votre connexion internet et réessayez.',
  'payment.failed': "Le paiement n'a pas abouti. Veuillez réessayer.",
  'payment.technicalProblem': 'Nous rencontrons actuellement des problèmes techniques, veuillez nous en excuser.',
  'payment.notForwarded': "Votre paiement est parti, mais la commande n'a pas pu être transmise. Veuillez appeler un serveur.",
  'payment.guestTimeout': 'Le processeur de paiements ne répond pas. Veuillez réessayer.',

  // Green success banner, flows 4–7
  'success.walletReady': 'Votre portefeuille Innopay est prêt, vous pouvez déjà commander',
  'success.orderSent': 'Votre commande a été transmise et est en cours de préparation',

  // Waiter called
  'waiter.coming': 'Un serveur arrive à votre table!',
  'waiter.comingEn': 'Waiter notified - someone will be with you shortly',

  // Restaurant closed popup
  'closed.title': 'Le restaurant est fermé',
  'closed.body': 'Merci de nous rendre visite à nouveau {day} à partir de {time}.',
  'closed.bodyEn': 'The restaurant is closed. Please visit us again {day} from {time}.',

  // Kitchen closed banner
  'kitchen.closedPill': 'Cuisine fermée',
  'kitchen.closedTitle': 'Cuisine fermée / Kitchen closed',
  'kitchen.closedBody': 'La cuisine a fermé à {time} mais vous pouvez commander pour plus tard en utilisant la commande différée 🕔',
  'kitchen.closedBodyEn': 'The kitchen closed at {time} but you can order for later using the delayed order feature 🕔',

  // Account created (blue banner; the credentials go by email, decision Q-R4-1)
  'account.createdTitle': 'Compte créé avec succès!',
  'account.orderPreparing': 'Votre commande est en cours de préparation',
  'account.name': 'Compte:',
  'account.balance': 'Solde:',
  'account.credentialsEmailed': '✉️ Vos identifiants vous ont été envoyés par email.',
  'account.savedHint': '💡 Vos identifiants sont sauvegardés. Vous pouvez commander directement la prochaine fois!',

  // Duplicate order modal
  'duplicate.title': 'Commande similaire récente',
  'duplicate.body': 'Une commande identique a été passée il y a moins de 15 minutes.',
  'duplicate.orderAnyway': 'Pas grave',
  'duplicate.cancel': 'Merci du rappel !',

  // External wallet (Hive Keychain / Ecency) and the FreeNow fallback
  'external.title': 'Portefeuille externe',
  'external.body': 'Ceci va ouvrir votre application Hive Keychain ou Ecency.',
  'external.noteLabel': 'Note:',
  'external.note': "Si l'application FreeNow (taxi) s'ouvre à la place, revenez ici et utilisez les options de secours.",
  'external.open': 'Ouvrir Hive Keychain',
  'external.cancel': 'Annuler',
  'external.freeNowTitle': "FreeNow s'est ouvert?",
  'external.freeNowBody': 'Pas de souci! Utilisez une de ces alternatives:',
  'external.payWithInnopay': 'Payer avec Innopay',
  'external.copyLink': 'Copier le lien de transaction',
  'external.retry': 'Réessayer quand même',
  'external.tip': 'Astuce: Ouvrez Hive Keychain manuellement, puis collez le lien copié.',

  // Import account modal
  'import.title': 'Importer un compte',
  'import.emailPrompt': "Entrez l'adresse email que vous avez utilisé pour créer le compte",
  'import.emailPlaceholder': 'votre@email.com',
  'import.attemptsLeftOne': '{count} tentative restante',
  'import.attemptsLeftMany': '{count} tentatives restantes',
  'import.searching': 'Recherche...',
  'import.retrieve': 'Récupérer',
  'import.codeSent': 'Un code de vérification a été envoyé à {email}',
  'import.codePlaceholder': 'Code à 6 chiffres',
  'import.verifying': 'Vérification...',
  'import.verify': 'Vérifier',
  'import.back': '← Retour',
  'import.selectPrompt': 'Plusieurs comptes trouvés. Sélectionnez celui à importer:',
  'import.accountLine': 'Solde: {balance} € • Créé: {date}',
  'import.invalidEmail': "Format d'email invalide",
  'import.notFoundFinal': 'Rien dans la base de données, désolé!',
  'import.maybeOtherEmail': 'Vous avez peut-être utilisé une adresse mail différente ({count} tentatives restantes)',
  'import.connectionError': 'Erreur de connexion au serveur',
  'import.enterCode': 'Entrez un code à 6 chiffres',

  // Guest checkout warning (order without an account / waiter without an account)
  'guest.waiterTitle': 'Appeler un serveur sans compte',
  'guest.waiterCost': 'Appeler un serveur sans compte coûte {fee} (commission carte bancaire).',
  'guest.waiterFree': 'En créant un compte Innopay {free}, ce service ne coûte que {fee}.',
  'guest.free': 'gratuit',
  'guest.waiterCreateAccount': 'Créer un compte (0.02€)',
  'guest.orderTitle': 'Commander sans compte',
  'guest.orderSurcharge': 'Commander sans compte implique une {surcharge} liée aux commissions de carte bancaire.',
  'guest.surcharge': 'charge supplémentaire de {percent}',
  'guest.discountLost': 'En commandant sans créer un compte vous {lost}',
  'guest.discountLostAmount': 'renoncez à un discount de: {amount}',
  'guest.goBack': 'Revenir pour bénéficier',
  'guest.redirecting': 'Redirection vers le paiement ({seconds}s/{max}s)',
  'guest.continuePay': 'Continuer et payer {amount}',

  // Connected wallet strip
  'wallet.connected': 'Connecté: @{username}',
  'wallet.active': 'Portefeuille Innopay actif',
  'wallet.disconnect': 'Déconnecter',
  'wallet.disconnectConfirm': 'Déconnecter votre portefeuille?',

  // Call waiter modal and confirmed strip
  'waiter.title': 'Appeler un serveur',
  'waiter.reasonPlaceholder': 'Motif (optionnel)...',
  'waiter.call': '🔔 Appeler (0.02€)',
  'waiter.requested': 'Serveur demandé',

  // Cart composition modal
  'composition.title': 'Composition de la commande',
  'composition.empty': 'Panier vide',
  'composition.size': 'Taille: {value}',
  'composition.cuisson': 'Cuisson: {value}',
  'composition.ingredients': 'Ingrédients: {value}',
  'composition.quantity': 'Quantité: {value}',
  'composition.total': 'Total:',
} as const;

export type TranslationKey = keyof typeof fr;
type Dictionary = Partial<Record<TranslationKey, string>>;

export const translations: { fr: Record<TranslationKey, string>; en: Dictionary; lb: Dictionary } = {
  fr,
  en: {}, // R5
  lb: {}, // R5
};

export type Language = keyof typeof translations;

export const languages: { code: Language; name: string; flag: string }[] = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'lb', name: 'Lëtzebuergesch', flag: '🇱🇺' },
];

/**
 * Languages a customer can get today. Only French until R5 fills `en`/`lb`: offering English
 * now would switch the shared wallet components to English while the page stays French.
 * R5 adds 'en' and 'lb' here, and the completeness test then requires every key in them.
 */
export const SUPPORTED_LANGUAGES: readonly Language[] = ['fr'];
