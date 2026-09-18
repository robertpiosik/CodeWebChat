export const translations = {
  'views.shared.actions.api.create.interactions.initial-select-model.fetching-models':
    {
      en: 'Fetching models...',
      pl: 'Pobieranie modeli...',
      'zh-cn': '正在获取模型...',
      ja: 'モデルを取得しています...',
      'zh-tw': '正在獲取模型...',
      de: 'Modelle werden abgerufen...',
      es: 'Obteniendo modelos...',
      fr: 'Récupération des modèles...',
      'pt-br': 'Buscando modelos...',
      ru: 'Получение моделей...',
      ko: '모델을 가져오는 중...',
      it: 'Recupero modelli in corso...',
      tr: 'Modeller getiriliyor...',
      cs: 'Načítání modelů...',
      hu: 'Modellek lekérése...',
      bg: 'Извличане на модели...'
    },
  'views.shared.actions.api.create.interactions.initial-select-model.models-route-not-found':
    {
      en: "The '/models' route was not found for {{provider name}}. This might mean the provider does not support listing models.",
      pl: "Nie znaleziono ścieżki '/models' dla {{provider name}}. Może to oznaczać, że dostawca nie obsługuje listowania modeli.",
      'zh-cn':
        "找不到 {{provider name}} 的 '/models' 路由。这可能意味着该提供商不支持列出模型。",
      ja: "{{provider name}} の '/models' ルートが見つかりませんでした。これは、プロバイダーがモデルのリスト表示をサポートしていない可能性があることを意味します。",
      'zh-tw':
        "找不到 {{provider name}} 的 '/models' 路由。這可能意味著該提供商不支持列出模型。",
      de: "Die Route '/models' wurde für {{provider name}} nicht gefunden. Dies könnte bedeuten, dass der Anbieter das Auflisten von Modellen nicht unterstützt.",
      es: "No se encontró la ruta '/models' para {{provider name}}. Esto podría significar que el proveedor no soporta listar modelos.",
      fr: "La route '/models' n'a pas été trouvée pour {{provider name}}. Cela pourrait signifier que le fournisseur ne prend pas en charge la liste des modèles.",
      'pt-br':
        "A rota '/models' não foi encontrada para {{provider name}}. Isso pode significar que o provedor não suporta a listagem de modelos.",
      ru: "Маршрут '/models' не найден для {{provider name}}. Это может означать, что провайдер не поддерживает список моделей.",
      ko: "{{provider name}}에 대한 '/models' 경로를 찾을 수 없습니다. 이는 공급자가 모델 나열을 지원하지 않을 수 있음을 의미합니다.",
      it: "La route '/models' non è stata trovata per {{provider name}}. Questo potrebbe significare che il provider non supporta l'elenco dei modelli.",
      tr: "{{provider name}} için '/models' rotası bulunamadı. Bu, sağlayıcının modelleri listelemeyi desteklemediği anlamına gelebilir.",
      cs: "Trasa '/models' nebyla nalezena pro {{provider name}}. To může znamenat, že poskytovatel nepodporuje výpis modelů.",
      hu: "A '/models' útvonal nem található ehhez: {{provider name}}. Ez azt jelentheti, hogy a szolgáltató nem támogatja a modellek listázását.",
      bg: "Маршрутът '/models' не беше намерен за {{provider name}}. Това може да означава, че доставчикът не поддържа списък с модели."
    }
} as const
