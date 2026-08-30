import { useMemo, useState } from "react";
import { MOBILE_APK_URL } from "../../constants";

function getInviteToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const params = new URLSearchParams(window.location.search);
  return (params.get("inviteToken") || "").trim();
}

export default function DownloadPage() {
  const inviteToken = useMemo(getInviteToken, []);
  const [copied, setCopied] = useState(false);

  const browserUrl = inviteToken
    ? `/?inviteToken=${encodeURIComponent(inviteToken)}`
    : "/";

  const handleCopyToken = async () => {
    if (!inviteToken) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="download-page">
      <main className="download-card">
        <div className="download-brand">
          <span className="download-logo" aria-hidden="true">
            <span className="download-logo-ring" />
            <span className="download-logo-core" />
          </span>
          <strong>TaskFlow</strong>
        </div>

        <h1 className="download-title">
          {inviteToken
            ? "Bir çalışma alanına davet edildin"
            : "TaskFlow mobil uygulaması"}
        </h1>
        <p className="download-subtitle">
          {inviteToken
            ? "Android uygulamasını kur, giriş yap ve davetini kabul et. İstersen tarayıcıdan da devam edebilirsin."
            : "Android cihazına TaskFlow uygulamasını kur."}
        </p>

        <a className="download-apk-btn" href={MOBILE_APK_URL} download>
          Android uygulamasını indir (.apk)
        </a>

        <ol className="download-steps">
          <li>APK dosyasını indir ve aç. Android “bilinmeyen kaynak” uyarısı verirse bu uygulamaya izin ver.</li>
          <li>Kurulum bittikten sonra uygulamayı aç ve Google ile giriş yap.</li>
          {inviteToken ? (
            <li>
              Üyeler ekranındaki <strong>“Davet Kodu ile Katıl”</strong> alanına
              aşağıdaki kodu yapıştır ve daveti kabul et.
            </li>
          ) : (
            <li>Seni davet eden kişiden aldığın davet kodunu uygulamaya gir.</li>
          )}
        </ol>

        {inviteToken ? (
          <div className="download-token-box">
            <span className="download-token-label">Davet kodun</span>
            <code className="download-token-value">{inviteToken}</code>
            <button
              type="button"
              className="download-token-copy"
              onClick={handleCopyToken}
            >
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          </div>
        ) : null}

        <a className="download-browser-link" href={browserUrl}>
          {inviteToken ? "Tarayıcıda devam et" : "Web uygulamasını aç"}
        </a>

        <p className="download-note">
          iPhone kullanıyorsan şimdilik tarayıcıdan devam et. iOS uygulaması hazırlanıyor.
        </p>
      </main>
    </div>
  );
}
