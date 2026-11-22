---
title: Backups in AWS sichern
description: Das verschlüsselte Backup jede Nacht in einen AWS-S3-Bucket hochladen, Backups älter als 14 Tage löscht AWS automatisch.
---

Dieses Kapitel ist **optional** und baut auf [Backups extern sichern](/optional/backup-external/) auf. Dort entsteht
jede Nacht eine mit **age** verschlüsselte Kopie des Backups. Hier lädt der Server diese Kopie zusätzlich in einen
**AWS-S3-Bucket** hoch, direkt im Anschluss an das nächtliche Backup auf der Festplatte. Dein Backup überlebt damit
auch den Verlust des Servers, ohne dass du etwas von Hand herunterladen musst.

Der Ablauf jede Nacht um 02:00 Uhr:

1. Das Skript sichert die Daten nach `/var/backups/phalnx` (wie im Kapitel [Nächtliches Backup](/optional/backup/)).
2. Es verschlüsselt das Archiv mit dem öffentlichen age-Schlüssel nach `/var/backups/phalnx-export`.
3. Es lädt die verschlüsselte Datei in den Bucket hoch.
4. AWS löscht Dateien im Bucket, die **älter als 14 Tage** sind. Das übernimmt eine Lebenszyklus-Regel des Buckets, der
   Server muss dafür nichts tun.

:::note[Warum nur verschlüsselte Dateien?]
Das Backup enthält den **Seed** und alle Passwörter im Klartext. Zu AWS geht darum **ausschließlich** die `.age`-Datei.
Den geheimen Schlüssel dazu hast nur du. Ohne Empfängerschlüssel (Schritt 3 im Kapitel
[Backups extern sichern](/optional/backup-external/)) lädt das Skript nichts hoch.
:::

:::caution[Voraussetzung]
Die Schritte 1 bis 5 aus [Backups extern sichern](/optional/backup-external/) müssen erledigt sein. Es muss also
`/var/backups/phalnx-export` mit einer `.age`-Datei geben. Außerdem brauchst du ein AWS-Konto.
:::

## 1. Bucket anlegen

In der AWS-Konsole unter **S3** → **Create bucket**:

- **Bucket name**: ein weltweit eindeutiger Name, zum Beispiel `phalnx-backup-<zufallszahl>`.
- **AWS Region**: eine Region nahe bei dir, zum Beispiel `eu-central-1` (Frankfurt). Merke dir die Region.
- **Block all public access**: **eingeschaltet lassen** (Standard).
- **Bucket Versioning**: **ausgeschaltet** lassen (Standard). Mit Versionierung bliebe eine „gelöschte“ Datei als alte
  Version erhalten, und die Regel unten räumte sie nicht auf.
- **Default encryption**: der Standard (SSE-S3) genügt. Die Dateien sind ohnehin schon mit age verschlüsselt.

## 2. Lebenszyklus-Regel: nach 14 Tagen löschen

Im Bucket unter **Management** → **Lifecycle rules** → **Create lifecycle rule**:

- **Lifecycle rule name**: `phalnx-14-tage`
- **Choose a rule scope**: **Limit the scope of this rule using one or more filters**, **Prefix**: `phalnx/`
- **Lifecycle rule actions**: ankreuzen
  - **Expire current versions of objects**
  - **Delete expired object delete markers or incomplete multipart uploads**
- **Expire current versions of objects**: **Days after object creation** = `14`
- **Delete incomplete multipart uploads**: **Number of days** = `1`

Speichern mit **Create rule**. Die Regel steht danach auf **Enabled**.

:::note[So genau ist die 14-Tage-Grenze]
AWS prüft die Regeln einmal täglich und löscht Dateien erst, wenn sie **mindestens 14 Tage** alt sind. Es liegen also
meist 14 bis 15 Backups im Bucket. Die Löschung kann nach Ablauf der Frist noch einige Stunden dauern. Das ist normal.
Lokal auf dem Server bleiben unabhängig davon die letzten 14 (`KEEP=14`).
:::

## 3. Benutzer mit minimalen Rechten anlegen

Der Server bekommt einen eigenen AWS-Benutzer, der **nur hochladen** darf. Er darf **nichts löschen und nichts
herunterladen**. Wird der Server übernommen, kann der Angreifer deine Backups im Bucket weder löschen noch lesen.

In der AWS-Konsole unter **IAM** → **Policies** → **Create policy** → Reiter **JSON**. Ersetze `<bucket>` (samt der
Klammern) durch den Namen deines Buckets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:AbortMultipartUpload"],
      "Resource": "arn:aws:s3:::<bucket>/phalnx/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::<bucket>",
      "Condition": { "StringLike": { "s3:prefix": ["phalnx/*"] } }
    }
  ]
}
```

Name der Policy: `phalnx-backup-upload`. Dann unter **IAM** → **Users** → **Create user**:

- **User name**: `phalnx-backup`
- **Provide user access to the AWS Management Console**: **nicht** ankreuzen.
- **Permissions**: **Attach policies directly**, die Policy `phalnx-backup-upload` wählen.

Öffne danach den Benutzer, Reiter **Security credentials** → **Create access key** → Anwendungsfall **Application running
outside AWS**. Es erscheinen **Access key ID** und **Secret access key**. Das Secret siehst du **nur jetzt**.

:::danger[Zugangsdaten sind Geheimnisse]
Speichere beide Werte im Passwortmanager. Schreibe sie nirgends sonst auf und gib sie nicht weiter. Der Benutzer
`phalnx-backup` darf nur in `phalnx/` hochladen. Auch so gilt: Gib ihm **nie** weitere Rechte, schon gar keine
Löschrechte.
:::

## 4. AWS CLI auf dem Server installieren

Ubuntu 24.04 liefert das Programm nicht mehr als Paket aus. Du nimmst den offiziellen Installer von Amazon. Auf dem
Server:

```bash
sudo apt install -y curl unzip
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-$(uname -m).zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
sudo /tmp/aws/install
rm -rf /tmp/aws /tmp/awscliv2.zip
```

Prüfe es:

```bash
aws --version
```

Es erscheint eine Zeile wie `aws-cli/2.x.x …`. Für ein späteres Update führst du dieselben Befehle noch einmal aus, nur
mit `sudo /tmp/aws/install --update`.

## 5. Zugangsdaten auf dem Server ablegen

Eine Datei nur für `root`. Ersetze die vier Platzhalter samt der Klammern durch deine Werte:

```bash
sudo nano /etc/phalnx-backup.s3
```

```bash title="/etc/phalnx-backup.s3"
BUCKET=<bucket>
AWS_DEFAULT_REGION=<eu-central-1>
AWS_ACCESS_KEY_ID=<Access key ID>
AWS_SECRET_ACCESS_KEY=<Secret access key>
```

Rechte setzen, damit nur `root` sie lesen kann:

```bash
sudo chown root:root /etc/phalnx-backup.s3
sudo chmod 600 /etc/phalnx-backup.s3
```

Existiert diese Datei nicht oder ist sie leer, lädt das Skript nichts hoch. Zum Abschalten genügt es also, sie zu
löschen.

## 6. Das Skript erweitern

Wie im Kapitel [Backups extern sichern](/optional/backup-external/#4-das-skript-erweitern) ergänzt du das Skript mit
zwei Befehlen. Prüfe zuerst, ob die Erweiterung schon drin ist:

```bash
sudo grep -c S3_FILE /usr/local/sbin/phalnx-backup
```

Bei **`1` oder mehr** ist sie schon drin, dann springst du zu Schritt 7. Bei **`0`** machst du Folgendes. Der erste
Befehl löscht die letzte Zeile des Skripts:

```bash
sudo sed -i '/^echo "Backup fertig/d' /usr/local/sbin/phalnx-backup
```

Der zweite hängt den Upload samt der letzten Zeile an. Kopiere ihn **ganz**, vom ersten `sudo` bis zum alleinstehenden
`EOF`:

```bash
sudo tee -a /usr/local/sbin/phalnx-backup > /dev/null <<'EOF'
# Optional: verschlüsselte Kopie in einen AWS-S3-Bucket hochladen (nur wenn /etc/phalnx-backup.s3 existiert)
S3_FILE=/etc/phalnx-backup.s3
S3_FAILED=0
if [ -s "$S3_FILE" ] && [ -e "$EXPORT/$NAME.tar.gz.age" ]; then
  if ( set -a; . "$S3_FILE"; aws s3 cp --only-show-errors "$EXPORT/$NAME.tar.gz.age" "s3://$BUCKET/phalnx/$NAME.tar.gz.age" ); then
    echo "AWS-Upload fertig: $NAME.tar.gz.age"
  else
    echo "AWS-Upload FEHLGESCHLAGEN: $NAME.tar.gz.age" >&2
    S3_FAILED=1
  fi
fi

echo "Backup fertig: $NAME.tar.gz"
[ "$S3_FAILED" -eq 0 ] || exit 1
EOF
```

Prüfe es danach noch einmal mit dem `grep`-Befehl von oben. Jetzt muss `1` oder mehr erscheinen.

Schlägt der Upload fehl (zum Beispiel wegen einer Netzstörung), bleibt das Backup auf der Festplatte trotzdem
vollständig. Das Skript meldet den Fehler im Log und endet mit einem Fehlerstatus. Dann zeigt `systemctl status
phalnx-backup` das Backup als **failed**, und du siehst es bei der Kontrolle.

:::note[Reihenfolge im Skript]
Der Upload-Block gehört **hinter** den Block mit der verschlüsselten Kopie, denn er nutzt `$EXPORT`. Hast du die Schritte
in der beschriebenen Reihenfolge ausgeführt, stimmt das automatisch.
:::

## 7. Auslösen und prüfen

Auf dem Server:

```bash
sudo systemctl start phalnx-backup.service
sudo journalctl -u phalnx-backup -n 20 --no-pager
```

Im Log muss **`AWS-Upload fertig: phalnx-<Datum>_<Uhrzeit>.tar.gz.age`** und danach `Backup fertig` stehen. Ob die Datei
wirklich im Bucket liegt, zeigt dieser Befehl (der Benutzer darf auflisten):

```bash
sudo bash -c 'set -a; . /etc/phalnx-backup.s3; aws s3 ls "s3://$BUCKET/phalnx/" --human-readable'
```

Es erscheint eine Zeile mit der Datei und ihrer Größe. In der AWS-Konsole findest du sie im Bucket unter `phalnx/`.
Öffnest du die Datei (**Properties**), steht bei **Expiry date** der Tag, an dem AWS sie löscht. Das zeigt dir, dass die
Lebenszyklus-Regel greift.

## 8. Ein Backup aus AWS zurückholen

Der Benutzer `phalnx-backup` darf nicht herunterladen. Das ist Absicht. Zum Zurückholen nimmst du die AWS-Konsole mit
deinem normalen Konto: Im Bucket unter `phalnx/` die gewünschte `.tar.gz.age`-Datei wählen und **Download** klicken.
Alternativ mit der AWS CLI auf deinem PC, wenn du dort ein eigenes Profil mit Leserechten eingerichtet hast:

```bash
aws s3 cp s3://<bucket>/phalnx/phalnx-2026-11-14_02-00.tar.gz.age .
```

Wie du die Datei entschlüsselst und zurückspielst, steht im Kapitel
[Externe Backups wiederherstellen](/optional/backup-restore/), ab Teil 1.

## Wenn es nicht klappt

| Problem | Ursache und Lösung |
|---|---|
| Im Log steht kein `AWS-Upload …` | Das Skript hat den Upload übersprungen. Prüfe 1. die Skriptversion: `sudo grep -c S3_FILE /usr/local/sbin/phalnx-backup` (mindestens `1`, sonst Schritt 6), 2. die Datei: `sudo cat /etc/phalnx-backup.s3` (nicht leer), 3. die verschlüsselte Kopie: `sudo ls /var/backups/phalnx-export` |
| `aws: command not found` | Die CLI fehlt oder ist nicht im Pfad von `root`. Prüfe mit `sudo which aws` und wiederhole Schritt 4. |
| `AccessDenied` beim Hochladen | Die Policy passt nicht. Prüfe, ob der Bucket-Name in beiden Zeilen stimmt, ob `/phalnx/*` am Ende steht und ob die Policy dem Benutzer zugewiesen ist. |
| `InvalidAccessKeyId` oder `SignatureDoesNotMatch` | Ein Wert in `/etc/phalnx-backup.s3` ist falsch, oft ein Leerzeichen oder ein Zeichen zu viel oder zu wenig. Erzeuge im Benutzer notfalls einen neuen Access Key. |
| `The authorization header is malformed` oder Weiterleitung (`301`) | Die Region in `AWS_DEFAULT_REGION` passt nicht zum Bucket. Sie steht in der Bucket-Liste der S3-Konsole. |
| `Could not connect to the endpoint URL` | Der Server erreicht AWS nicht. Prüfe die Verbindung mit `curl -sI https://s3.amazonaws.com` und die [Firewall](/server/ssh-hardening/) (ausgehend ist normalerweise alles offen). |
| Alte Dateien bleiben im Bucket | Prüfe, ob die Regel **Enabled** ist und den Prefix `phalnx/` hat, und ob die Versionierung aus ist. Die Löschung dauert nach Ablauf der Frist bis zu einem Tag. |

Zurück zum Überblick: [Nächtliches Backup](/optional/backup/).
