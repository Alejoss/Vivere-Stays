import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import LanguageSwitcher from "../LanguageSwitcher";
import { useCurrentUser } from "../../../shared/api/hooks";

interface OnboardingHeaderControlsProps {
  className?: string;
}

export default function OnboardingHeaderControls({
  className,
}: OnboardingHeaderControlsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { isAuthenticated } = useCurrentUser();

  const handleLogout = useCallback(() => {
    navigate("/logout");
  }, [navigate]);

  const baseClassName = `absolute top-4 right-4 z-10${className ? ` ${className}` : ""}`;

  if (!isAuthenticated) {
    return (
      <div className={baseClassName}>
        <LanguageSwitcher variant="header" />
      </div>
    );
  }

  return (
    <div className={`${baseClassName} flex items-center gap-3`}>
      <button
        type="button"
        onClick={handleLogout}
        className="px-4 py-2 text-sm font-semibold text-white bg-[#294758] hover:bg-[#1e3340] rounded-[8px] shadow-[0_4px_11px_0_rgba(0,0,0,0.15)] transition-colors"
        aria-label={t("navigation.logout")}
      >
        {t("navigation.logout")}
      </button>
      <LanguageSwitcher variant="header" />
    </div>
  );
}

