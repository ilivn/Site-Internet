# LootRadar — Comparateur de prix de jeux PC

LootRadar trouve le prix le plus bas d'un jeu PC parmi plus de 30 boutiques officielles (Steam, GOG, Epic Games Store, Humble, Fanatical…).

Projet réalisé dans le cadre de mon portfolio de **BTS SIO** par **Ilian SEGHIRI**.

## Fonctionnalités

- **Recherche instantanée** : les résultats s'affichent pendant la saisie, avec un délai pour limiter les appels à l'API.
- **Fiche détaillée** : prix du jeu dans chaque boutique, classés du moins cher au plus cher, et plus bas prix historique.
- **Bons plans du moment** : meilleures affaires, plus grosses remises, jeux à moins de 5 $.
- **Gestion des états** : chargement, erreur réseau, aucun résultat.
- **Accessibilité** : navigation au clavier, lien d'évitement, fenêtre de détail accessible, respect du réglage « réduire les animations ».
- **Responsive** : mobile, tablette et ordinateur.

## Technologies

- HTML5, CSS3 et JavaScript (sans framework ni dépendance)
- API REST publique [CheapShark](https://apidocs.cheapshark.com) via `fetch`
- Hébergement statique avec GitHub Pages

## Points de sécurité

- Tout le texte reçu de l'API est **échappé** avant d'être inséré dans la page, pour se protéger des injections XSS.
- Aucun JavaScript inline dans le HTML généré.
- Les liens externes utilisent `rel="noopener"`.
- Aucune clé secrète : l'API utilisée est publique.

## Lancer le projet

1. Télécharger ou cloner le dépôt.
2. Ouvrir `index.html` dans un navigateur.

Une connexion Internet est nécessaire pour récupérer les prix.

## Limites connues

- Les prix sont en **dollars US** : c'est la devise fournie par CheapShark.
- Seuls les **jeux PC** sont couverts.
- Les prix peuvent changer à tout moment : ils doivent être vérifiés sur la boutique avant l'achat.

## Crédits

Données de prix fournies par [CheapShark](https://www.cheapshark.com). Images des jeux issues de Steam lorsque disponibles.
