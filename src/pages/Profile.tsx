import { useState, FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateUserProfile } from "../lib/firestore";
import { LogOut, User, Mail, MapPin } from "lucide-react";
import { logout } from "../lib/auth";

const ESTADOS: Record<string, string> = {
  "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
  "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
  "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
  "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
  "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
  "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina",
  "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"
};

const CIDADES: Record<string, string[]> = {
  "SP": ["Sao Paulo", "Campinas", "Guarulhos", "Sao Bernardo do Campo", "Santo Andre", "Osasco", "Sorocaba", "Ribeirao Preto", "Santos", "Sao Jose dos Campos"],
  "RJ": ["Rio de Janeiro", "Niteroi", "Sao Goncalo", "Duque de Caxias", "Nova Iguacu", "Belford Roxo", "Campos dos Goytacazes", "Petropolis"],
  "MG": ["Belo Horizonte", "Uberlandia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros", "Uberaba", "Governador Valadares"],
  "BA": ["Salvador", "Feira de Santana", "Vitoria da Conquista", "Camacari", "Itabuna", "Juazeiro", "Lauro de Freitas"],
  "CE": ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanau", "Sobral"],
  "PE": ["Recife", "Jaboatao dos Guararapes", "Olinda", "Caruaru", "Paulista", "Petrolina"],
  "RS": ["Porto Alegre", "Caxias do Sul", "Canoas", "Pelotas", "Santa Maria", "Gravatai", "Novo Hamburgo"],
  "PR": ["Curitiba", "Londrina", "Maringa", "Ponta Grossa", "Cascavel", "Sao Jose dos Pinhais", "Foz do Iguacu"],
  "DF": ["Brasilia"],
  "GO": ["Goiania", "Aparecida de Goiania", "Anapolis", "Rio Verde", "Luziania"],
  "AM": ["Manaus", "Parintins", "Itacoatiara"],
  "PA": ["Belem", "Ananindeua", "Santarem", "Maraba"],
  "MA": ["Sao Luis", "Imperatriz", "Sao Jose de Ribamar", "Timon"],
  "PB": ["Joao Pessoa", "Campina Grande", "Santa Rita"],
  "RN": ["Natal", "Mossoro", "Parnamirim"],
  "MT": ["Cuiaba", "Varzea Grande", "Rondonopolis", "Sinop"],
  "MS": ["Campo Grande", "Dourados", "Tres Lagoas", "Corumba"],
  "PI": ["Teresina", "Parnaiba"],
  "SE": ["Aracaju", "Nossa Senhora do Socorro"],
  "SC": ["Florianopolis", "Joinville", "Blumenau", "Sao Jose", "Chapeco", "Itajai", "Criciuma"],
  "AL": ["Maceio", "Arapiraca", "Rio Largo"],
  "ES": ["Vitoria", "Vila Velha", "Serra", "Cariacica", "Cachoeiro de Itapemirim"],
  "RO": ["Porto Velho", "Ji-Parana"],
  "TO": ["Palmas", "Araguaina", "Gurupi"],
  "AC": ["Rio Branco"],
  "AP": ["Macapa"],
  "RR": ["Boa Vista"],
};

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [state, setState] = useState(profile?.state || "SP");
  const [city, setCity] = useState(profile?.city || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await updateUserProfile(user.uid, { name, state, city, regionCode: state });
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Estado</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={state}
                  onChange={(e) => { setState(e.target.value); setCity(""); }}
                  className="input-field pl-10"
                >
                  {Object.entries(ESTADOS).map(([uf, nome]) => (
                    <option key={uf} value={uf}>{uf} - {nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Cidade</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field pl-10"
                >
                  <option value="">Todo o estado</option>
                  {(CIDADES[state] || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Os preços estimados serão baseados na sua cidade/estado. Você pode editar preços individuais ao adicionar itens.
          </p>

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
