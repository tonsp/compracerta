import { useState, FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateUserProfile } from "../lib/firestore";
import { LogOut, User, Mail, MapPin } from "lucide-react";
import { logout } from "../lib/auth";

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [state, setState] = useState(profile?.state || "SP");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await updateUserProfile(user.uid, { name, state, regionCode: state });
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perfil</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie seus dados e sua região.</p>
      </div>

      <div className="card">
        {profile?.photoURL && (
          <div className="flex justify-center mb-6">
            <img src={profile.photoURL} alt="Foto" className="w-20 h-20 rounded-full" />
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field pl-10" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={profile?.email || ""} disabled className="input-field pl-10 bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Estado (referência de preços)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={state} onChange={(e) => setState(e.target.value)} className="input-field pl-10">
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Os preços estimados serão baseados no seu estado. Você pode editar preços individuais na lista.
            </p>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar alterações"}
          </button>
        </form>
      </div>

      <button
        onClick={() => logout()}
        className="w-full py-3 text-red-600 border border-red-200 dark:border-red-900 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  );
}
