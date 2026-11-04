$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$targetScheme = $args[0]
$lang = $args[1]
$commitSha = $args[2]

$msg_error="Error:"
$msg_git_required="git is required but not installed."
$msg_node_required="Failed to find a compatible Node.js version and no supported version manager (fnm, nvm) could switch it."
$msg_no_editors="No supported editors found in your PATH."
$msg_invalid="Invalid choice. Exiting."
$msg_hint="Hint: If your editor is installed but not listed, you might need to add its command to your PATH."
$msg_hint2="Open your editor, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P), and find a command like: `"Shell Command: Install 'cursor' command in PATH`" (or 'agy-ide', etc.)."
$msg_all_editors="All detected editors"
$msg_quit="Quit"
$msg_select_install="Select where to install CWC to: "
$msg_cancelled="Installation cancelled."
$msg_step_cloning="Cloning repository"
$msg_step_deps="Installing dependencies"
$msg_step_build="Building extension"
$msg_step_install="Installing to"
$msg_vsix_error="VSIX file was not generated."
$msg_install_fail="Failed to install to"
$msg_updated="Updated successfully! Please restart the editor for changes to take effect."
$msg_success="Successfully installed to"

switch -Regex ($lang) {
    "^pl" {
        $msg_error="Błąd:"
        $msg_git_required="git jest wymagany, ale nie jest zainstalowany."
        $msg_node_required="Nie znaleziono kompatybilnej wersji Node.js i żaden obsługiwany menedżer wersji (fnm, nvm) nie mógł jej przełączyć."
        $msg_no_editors="W zmiennej PATH nie znaleziono obsługiwanych edytorów."
        $msg_invalid="Nieprawidłowy wybór. Zakończenie."
        $msg_hint="Wskazówka: Jeśli Twój edytor jest zainstalowany, ale nie znajduje się na liście, może być konieczne dodanie jego polecenia do zmiennej PATH."
        $msg_hint2="Otwórz edytor, otwórz Paletę Poleceń (Ctrl+Shift+P / Cmd+Shift+P) i znajdź polecenie w stylu: `"Shell Command: Install 'cursor' command in PATH`" (lub 'agy-ide', itp.)."
        $msg_all_editors="Wszystkie wykryte edytory"
        $msg_quit="Wyjdź"
        $msg_select_install="Wybierz, gdzie zainstalować CWC: "
        $msg_cancelled="Instalacja anulowana."
        $msg_step_cloning="Klonowanie repozytorium"
        $msg_step_deps="Instalowanie zależności"
        $msg_step_build="Budowanie rozszerzenia"
        $msg_step_install="Instalowanie w"
        $msg_vsix_error="Plik VSIX nie został wygenerowany."
        $msg_install_fail="Nie udało się zainstalować w"
        $msg_updated="Pomyślnie zaktualizowano! Zrestartuj edytor, aby zmiany zaczęły obowiązywać."
        $msg_success="Pomyślnie zainstalowano w"
        break
    }
    "^zh-(tw|hk)" {
        $msg_error="錯誤："
        $msg_git_required="需要 git 但尚未安裝。"
        $msg_node_required="找不到相容的 Node.js 版本，且沒有支援的版本管理工具 (fnm, nvm) 可以切換。"
        $msg_no_editors="在你的 PATH 中找不到支援的編輯器。"
        $msg_invalid="無效的選擇。退出中。"
        $msg_hint="提示：如果你的編輯器已安裝但未列出，你可能需要將其指令加入至 PATH。"
        $msg_hint2="開啟你的編輯器，開啟指令選擇區 (Ctrl+Shift+P / Cmd+Shift+P)，然後找到類似的指令：「Shell Command: Install 'cursor' command in PATH」（或 'agy-ide' 等）。"
        $msg_all_editors="所有偵測到的編輯器"
        $msg_quit="退出"
        $msg_select_install="選擇要安裝 CWC 的位置： "
        $msg_cancelled="安裝已取消。"
        $msg_step_cloning="正在複製儲存庫"
        $msg_step_deps="正在安裝依賴套件"
        $msg_step_build="正在建立擴充功能"
        $msg_step_install="正在安裝至"
        $msg_vsix_error="未產生 VSIX 檔案。"
        $msg_install_fail="無法安裝至"
        $msg_updated="更新成功！請重新啟動編輯器以使變更生效。"
        $msg_success="成功安裝至"
        break
    }
    "^zh" {
        $msg_error="错误："
        $msg_git_required="需要 git 但尚未安装。"
        $msg_node_required="找不到兼容的 Node.js 版本，并且没有支持的版本管理器 (fnm, nvm) 可以切换它。"
        $msg_no_editors="在您的 PATH 中未找到支持的编辑器。"
        $msg_invalid="无效的选择。正在退出。"
        $msg_hint="提示：如果您的编辑器已安装但未列出，您可能需要将其命令添加到您的 PATH 中。"
        $msg_hint2="打开您的编辑器，打开命令面板 (Ctrl+Shift+P / Cmd+Shift+P)，然后找到类似以下的命令：`"Shell Command: Install 'cursor' command in PATH`"（或 'agy-ide' 等）。"
        $msg_all_editors="所有检测到的编辑器"
        $msg_quit="退出"
        $msg_select_install="选择将 CWC 安装到哪里： "
        $msg_cancelled="安装已取消。"
        $msg_step_cloning="正在克隆仓库"
        $msg_step_deps="正在安装依赖"
        $msg_step_build="正在构建扩展"
        $msg_step_install="正在安装到"
        $msg_vsix_error="未生成 VSIX 文件。"
        $msg_install_fail="未能安装到"
        $msg_updated="更新成功！请重启编辑器以使更改生效。"
        $msg_success="成功安装到"
        break
    }
    "^ja" {
        $msg_error="エラー:"
        $msg_git_required="gitが必要ですが、インストールされていません。"
        $msg_node_required="互換性のあるNode.jsバージョンが見つからず、サポートされているバージョンマネージャー (fnm, nvm) でも切り替えられませんでした。"
        $msg_no_editors="PATHにサポートされているエディターが見つかりません。"
        $msg_invalid="無効な選択です。終了します。"
        $msg_hint="ヒント: エディターがインストールされているのにリストにない場合、PATHにそのコマンドを追加する必要があるかもしれません。"
        $msg_hint2="エディターを開き、コマンドパレット (Ctrl+Shift+P / Cmd+Shift+P) を開いて、次のようなコマンドを見つけます：「Shell Command: Install 'cursor' command in PATH」（または 'agy-ide' など）。"
        $msg_all_editors="検出されたすべてのエディター"
        $msg_quit="終了"
        $msg_select_install="CWCのインストール先を選択してください: "
        $msg_cancelled="インストールがキャンセルされました。"
        $msg_step_cloning="リポジトリをクローン中"
        $msg_step_deps="依存関係をインストール中"
        $msg_step_build="拡張機能をビルド中"
        $msg_step_install="インストール中:"
        $msg_vsix_error="VSIXファイルが生成されませんでした。"
        $msg_install_fail="インストールに失敗しました:"
        $msg_updated="更新が成功しました！変更を適用するにはエディターを再起動してください。"
        $msg_success="正常にインストールされました:"
        break
    }
    "^de" {
        $msg_error="Fehler:"
        $msg_git_required="git wird benötigt, ist aber nicht installiert."
        $msg_node_required="Es konnte keine kompatible Node.js-Version gefunden werden und kein unterstützter Versionsmanager (fnm, nvm) konnte sie wechseln."
        $msg_no_editors="Keine unterstützten Editoren in Ihrem PATH gefunden."
        $msg_invalid="Ungültige Auswahl. Beenden."
        $msg_hint="Tipp: Wenn Ihr Editor installiert, aber nicht aufgeführt ist, müssen Sie möglicherweise seinen Befehl zu Ihrem PATH hinzufügen."
        $msg_hint2="Öffnen Sie Ihren Editor, öffnen Sie die Befehlspalette (Ctrl+Shift+P / Cmd+Shift+P) und suchen Sie nach einem Befehl wie: `"Shell Command: Install 'cursor' command in PATH`" (oder 'agy-ide' usw.)."
        $msg_all_editors="Alle erkannten Editoren"
        $msg_quit="Beenden"
        $msg_select_install="Wählen Sie aus, wo CWC installiert werden soll: "
        $msg_cancelled="Installation abgebrochen."
        $msg_step_cloning="Repository klonen"
        $msg_step_deps="Abhängigkeiten installieren"
        $msg_step_build="Erweiterung erstellen"
        $msg_step_install="Installieren in"
        $msg_vsix_error="VSIX-Datei wurde nicht generiert."
        $msg_install_fail="Fehler bei der Installation in"
        $msg_updated="Erfolgreich aktualisiert! Bitte starten Sie den Editor neu, damit die Änderungen wirksam werden."
        $msg_success="Erfolgreich installiert in"
        break
    }
    "^es" {
        $msg_error="Error:"
        $msg_git_required="Se requiere git pero no está instalado."
        $msg_node_required="No se pudo encontrar una versión compatible de Node.js y ningún administrador de versiones soportado (fnm, nvm) pudo cambiarla."
        $msg_no_editors="No se encontraron editores soportados en su PATH."
        $msg_invalid="Elección inválida. Saliendo."
        $msg_hint="Sugerencia: Si su editor está instalado pero no aparece en la lista, es posible que deba agregar su comando a su PATH."
        $msg_hint2="Abra su editor, abra la Paleta de comandos (Ctrl+Shift+P / Cmd+Shift+P) y busque un comando como: `"Shell Command: Install 'cursor' command in PATH`" (o 'agy-ide', etc.)."
        $msg_all_editors="Todos los editores detectados"
        $msg_quit="Salir"
        $msg_select_install="Seleccione dónde instalar CWC: "
        $msg_cancelled="Instalación cancelada."
        $msg_step_cloning="Clonando repositorio"
        $msg_step_deps="Instalando dependencias"
        $msg_step_build="Construyendo extensión"
        $msg_step_install="Instalando en"
        $msg_vsix_error="No se generó el archivo VSIX."
        $msg_install_fail="Fallo al instalar en"
        $msg_updated="¡Actualizado correctamente! Reinicie el editor para que los cambios surtan efecto."
        $msg_success="Instalado correctamente en"
        break
    }
    "^fr" {
        $msg_error="Erreur :"
        $msg_git_required="git est requis mais n'est pas installé."
        $msg_node_required="Impossible de trouver une version compatible de Node.js et aucun gestionnaire de versions pris en charge (fnm, nvm) n'a pu la modifier."
        $msg_no_editors="Aucun éditeur pris en charge trouvé dans votre PATH."
        $msg_invalid="Choix invalide. Sortie."
        $msg_hint="Astuce : Si votre éditeur est installé mais ne figure pas dans la liste, vous devrez peut-être ajouter sa commande à votre PATH."
        $msg_hint2="Ouvrez votre éditeur, ouvrez la Palette de commandes (Ctrl+Shift+P / Cmd+Shift+P) et cherchez une commande comme : `"Shell Command: Install 'cursor' command in PATH`" (ou 'agy-ide', etc.)."
        $msg_all_editors="Tous les éditeurs détectés"
        $msg_quit="Quitter"
        $msg_select_install="Choisissez où installer CWC : "
        $msg_cancelled="Installation annulée."
        $msg_step_cloning="Clonage du dépôt"
        $msg_step_deps="Installation des dépendances"
        $msg_step_build="Construction de l'extension"
        $msg_step_install="Installation sur"
        $msg_vsix_error="Le fichier VSIX n'a pas été généré."
        $msg_install_fail="Échec de l'installation sur"
        $msg_updated="Mise à jour réussie ! Veuillez redémarrer l'éditeur pour que les modifications prennent effet."
        $msg_success="Installé avec succès sur"
        break
    }
    "^pt" {
        $msg_error="Erro:"
        $msg_git_required="git é necessário mas não está instalado."
        $msg_node_required="Falha ao encontrar uma versão compatível do Node.js e nenhum gerenciador de versões suportado (fnm, nvm) pôde alterná-la."
        $msg_no_editors="Nenhum editor suportado encontrado no seu PATH."
        $msg_invalid="Escolha inválida. Saindo."
        $msg_hint="Dica: Se o seu editor está instalado mas não está listado, você pode precisar adicionar o comando dele ao seu PATH."
        $msg_hint2="Abra o seu editor, abra a Paleta de Comandos (Ctrl+Shift+P / Cmd+Shift+P) e encontre um comando como: `"Shell Command: Install 'cursor' command in PATH`" (ou 'agy-ide', etc.)."
        $msg_all_editors="Todos os editores detectados"
        $msg_quit="Sair"
        $msg_select_install="Selecione onde instalar o CWC: "
        $msg_cancelled="Instalação cancelada."
        $msg_step_cloning="Clonando repositório"
        $msg_step_deps="Instalando dependências"
        $msg_step_build="Construindo extensão"
        $msg_step_install="Instalando no"
        $msg_vsix_error="O arquivo VSIX não foi gerado."
        $msg_install_fail="Falha ao instalar no"
        $msg_updated="Atualizado com sucesso! Reinicie o editor para que as alterações tenham efeito."
        $msg_success="Instalado com sucesso no"
        break
    }
    "^ru" {
        $msg_error="Ошибка:"
        $msg_git_required="git обязателен, но не установлен."
        $msg_node_required="Не удалось найти совместимую версию Node.js, и ни один поддерживаемый менеджер версий (fnm, nvm) не смог её переключить."
        $msg_no_editors="В вашем PATH не найдено поддерживаемых редакторов."
        $msg_invalid="Неверный выбор. Выход."
        $msg_hint="Подсказка: Если ваш редактор установлен, но его нет в списке, возможно, вам нужно добавить его команду в PATH."
        $msg_hint2="Откройте редактор, откройте Палитру команд (Ctrl+Shift+P / Cmd+Shift+P) и найдите команду, подобную: `"Shell Command: Install 'cursor' command in PATH`" (или 'agy-ide' и т. д.)."
        $msg_all_editors="Все обнаруженные редакторы"
        $msg_quit="Выход"
        $msg_select_install="Выберите, куда установить CWC: "
        $msg_cancelled="Установка отменена."
        $msg_step_cloning="Клонирование репозитория"
        $msg_step_deps="Установка зависимостей"
        $msg_step_build="Сборка расширения"
        $msg_step_install="Установка в"
        $msg_vsix_error="Файл VSIX не был сгенерирован."
        $msg_install_fail="Не удалось установить в"
        $msg_updated="Успешно обновлено! Перезапустите редактор, чтобы изменения вступили в силу."
        $msg_success="Успешно установлено в"
        break
    }
    "^ko" {
        $msg_error="오류:"
        $msg_git_required="git이 필요하지만 설치되지 않았습니다."
        $msg_node_required="호환되는 Node.js 버전을 찾지 못했으며 지원되는 버전 관리자(fnm, nvm)로 전환할 수 없습니다."
        $msg_no_editors="PATH에서 지원되는 편집기를 찾을 수 없습니다."
        $msg_invalid="잘못된 선택입니다. 종료합니다."
        $msg_hint="힌트: 편집기가 설치되어 있지만 목록에 없는 경우 해당 명령을 PATH에 추가해야 할 수 있습니다."
        $msg_hint2="편집기를 열고 명령 팔레트(Ctrl+Shift+P / Cmd+Shift+P)를 열어 다음과 같은 명령을 찾습니다: `"Shell Command: Install 'cursor' command in PATH`" (또는 'agy-ide' 등)."
        $msg_all_editors="감지된 모든 편집기"
        $msg_quit="종료"
        $msg_select_install="CWC를 설치할 위치 선택: "
        $msg_cancelled="설치가 취소되었습니다."
        $msg_step_cloning="리포지토리 복제 중"
        $msg_step_deps="종속성 설치 중"
        $msg_step_build="확장 프로그램 빌드 중"
        $msg_step_install="설치 중:"
        $msg_vsix_error="VSIX 파일이 생성되지 않았습니다."
        $msg_install_fail="설치 실패:"
        $msg_updated="성공적으로 업데이트되었습니다! 변경 사항을 적용하려면 편집기를 다시 시작하세요."
        $msg_success="성공적으로 설치되었습니다:"
        break
    }
    "^it" {
        $msg_error="Errore:"
        $msg_git_required="git è richiesto ma non è installato."
        $msg_node_required="Impossibile trovare una versione di Node.js compatibile e nessun gestore di versioni supportato (fnm, nvm) ha potuto modificarla."
        $msg_no_editors="Nessun editor supportato trovato nel tuo PATH."
        $msg_invalid="Scelta non valida. Uscita."
        $msg_hint="Suggerimento: Se il tuo editor è installato ma non in elenco, potresti dover aggiungere il suo comando al tuo PATH."
        $msg_hint2="Apri il tuo editor, apri la Riquadro comandi (Ctrl+Shift+P / Cmd+Shift+P) e cerca un comando come: `"Shell Command: Install 'cursor' command in PATH`" (o 'agy-ide', ecc.)."
        $msg_all_editors="Tutti gli editor rilevati"
        $msg_quit="Esci"
        $msg_select_install="Seleziona dove installare CWC: "
        $msg_cancelled="Installazione annullata."
        $msg_step_cloning="Clonazione repository"
        $msg_step_deps="Installazione dipendenze"
        $msg_step_build="Costruzione estensione"
        $msg_step_install="Installazione su"
        $msg_vsix_error="Il file VSIX non è stato generato."
        $msg_install_fail="Installazione non riuscita su"
        $msg_updated="Aggiornato con successo! Riavvia l'editor affinché le modifiche abbiano effetto."
        $msg_success="Installato con successo su"
        break
    }
    "^tr" {
        $msg_error="Hata:"
        $msg_git_required="git gerekli ancak yüklü değil."
        $msg_node_required="Uyumlu bir Node.js sürümü bulunamadı ve desteklenen hiçbir sürüm yöneticisi (fnm, nvm) geçiş yapamadı."
        $msg_no_editors="PATH'inizde desteklenen hiçbir düzenleyici bulunamadı."
        $msg_invalid="Geçersiz seçim. Çıkılıyor."
        $msg_hint="İpucu: Düzenleyiciniz yüklüyse ancak listede yoksa, komutunu PATH'inize eklemeniz gerekebilir."
        $msg_hint2="Düzenleyicinizi açın, Komut Paleti'ni açın (Ctrl+Shift+P / Cmd+Shift+P) ve şu şekilde bir komut bulun: `"Shell Command: Install 'cursor' command in PATH`" (veya 'agy-ide', vb.)."
        $msg_all_editors="Algılanan tüm düzenleyiciler"
        $msg_quit="Çıkış"
        $msg_select_install="CWC'nin nereye kurulacağını seçin: "
        $msg_cancelled="Kurulum iptal edildi."
        $msg_step_cloning="Depo kopyalanıyor"
        $msg_step_deps="Bağımlılıklar yükleniyor"
        $msg_step_build="Uzantı oluşturuluyor"
        $msg_step_install="Şuraya kuruluyor:"
        $msg_vsix_error="VSIX dosyası oluşturulmadı."
        $msg_install_fail="Şuraya kurulum başarısız:"
        $msg_updated="Başarıyla güncellendi! Değişikliklerin etkili olması için lütfen düzenleyiciyi yeniden başlatın."
        $msg_success="Şuraya başarıyla kuruldu:"
        break
    }
    "^cs" {
        $msg_error="Chyba:"
        $msg_git_required="git je vyžadován, ale není nainstalován."
        $msg_node_required="Nepodařilo se najít kompatibilní verzi Node.js a žádný podporovaný správce verzí (fnm, nvm) ji nedokázal přepnout."
        $msg_no_editors="Ve vaší proměnné PATH nebyly nalezeny žádné podporované editory."
        $msg_invalid="Neplatná volba. Ukončování."
        $msg_hint="Tip: Pokud je váš editor nainstalován, ale není uveden v seznamu, možná budete muset přidat jeho příkaz do PATH."
        $msg_hint2="Otevřete svůj editor, otevřete Paletu příkazů (Ctrl+Shift+P / Cmd+Shift+P) a najděte příkaz jako: `"Shell Command: Install 'cursor' command in PATH`" (nebo 'agy-ide' atd.)."
        $msg_all_editors="Všechny zjištěěné editory"
        $msg_quit="Ukončit"
        $msg_select_install="Vyberte, kam nainstalovat CWC: "
        $msg_cancelled="Instalace zrušena."
        $msg_step_cloning="Klonování repozitáře"
        $msg_step_deps="Instalace závislostí"
        $msg_step_build="Sestavování rozšíření"
        $msg_step_install="Instalace do"
        $msg_vsix_error="Soubor VSIX nebyl vygenerován."
        $msg_install_fail="Nepodařilo se nainstalovat do"
        $msg_updated="Úspěšně aktualizováno! Restartujte prosím editor, aby se změny projevily."
        $msg_success="Úspěšně nainstalováno do"
        break
    }
    "^hu" {
        $msg_error="Hiba:"
        $msg_git_required="git szükséges, de nincs telepítve."
        $msg_node_required="Nem sikerült kompatibilis Node.js verziót találni, és egyik támogatott verziókezelő (fnm, nvm) sem tudott átváltani rá."
        $msg_no_editors="Nem található támogatott szerkesztő a PATH-ban."
        $msg_invalid="Érvénytelen választás. Kilépés."
        $msg_hint="Tipp: Ha a szerkesztő telepítve van, de nem szerepel a listán, előfordulhat, hogy hozzá kell adnia a parancsát a PATH-hoz."
        $msg_hint2="Nyissa meg a szerkesztőt, nyissa meg a Parancskatalógust (Ctrl+Shift+P / Cmd+Shift+P), és keressen egy ilyen parancsot: `"Shell Command: Install 'cursor' command in PATH`" (vagy 'agy-ide', stb.)."
        $msg_all_editors="Minden észlelt szerkesztő"
        $msg_quit="Kilépés"
        $msg_select_install="Válassza ki, hová telepítse a CWC-t: "
        $msg_cancelled="Telepítés megszakítva."
        $msg_step_cloning="Tároló klónozása"
        $msg_step_deps="Függőségek telepítése"
        $msg_step_build="Bővítmény fordítása"
        $msg_step_install="Telepítés ide:"
        $msg_vsix_error="A VSIX fájl nem jött létre."
        $msg_install_fail="Nem sikerült telepíteni ide:"
        $msg_updated="Sikeresen frissítve! Kérjük, indítsa újra a szerkesztőt a változtatások érvénybe léptetéséhez."
        $msg_success="Sikeresen telepítve ide:"
        break
    }
    "^bg" {
        $msg_error="Грешка:"
        $msg_git_required="git е необходим, но не е инсталиран."
        $msg_node_required="Не бе намерен съвместим Node.js и никой поддържан мениджър на версии (fnm, nvm) не можа да го превключи."
        $msg_no_editors="Не са намерени поддържани редактори във вашия PATH."
        $msg_invalid="Невалиден избор. Изход."
        $msg_hint="Подсказка: Ако вашият редактор е инсталиран, но не е в списъка, може да се наложи да добавите неговата команда към PATH."
        $msg_hint2="Отворете вашия редактор, отворете Палитрата с команди (Ctrl+Shift+P / Cmd+Shift+P) и намерете команда като: `"Shell Command: Install 'cursor' command in PATH`" (или 'agy-ide' и т.н.)."
        $msg_all_editors="Всички открити редактори"
        $msg_quit="Изход"
        $msg_select_install="Изберете къде да инсталирате CWC: "
        $msg_cancelled="Инсталацията е отменена."
        $msg_step_cloning="Клониране на хранилището"
        $msg_step_deps="Инсталиране на зависимости"
        $msg_step_build="Изграждане на разширението"
        $msg_step_install="Инсталиране в"
        $msg_vsix_error="VSIX файлът не бе създаден."
        $msg_install_fail="Неуспешно инсталиране в"
        $msg_updated="Успешно актуализирано! Моля, рестартирайте редактора, за да влязат в сила промените."
        $msg_success="Успешно инсталирано в"
        break
    }
}

function Fail($Message) {
    Write-Host "$msg_error $Message" -ForegroundColor Red
    Pause
    exit 1
}

if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Fail $msg_git_required
}

$nodeIsGood = (Get-Command node -ErrorAction SilentlyContinue) -and ([version]((node -v) -replace '^v','')).Major -ge 20

if (!$nodeIsGood) {
    $prevPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if (Get-Command fnm -ErrorAction SilentlyContinue) {
            fnm env --shell powershell | Out-String | Invoke-Expression
            fnm install 22 *>$null
            fnm use 22 *>$null
        } elseif (Get-Command nvm -ErrorAction SilentlyContinue) {
            nvm install 22 *>$null
            nvm use 22 *>$null
        } else {
            Fail $msg_node_required
        }
    } finally {
        $ErrorActionPreference = $prevPreference
    }
}

$editorsToCheck = @(
    @{ Name = "VS Code"; Cmd = "code"; Scheme = "vscode" },
    @{ Name = "VS Code Insiders"; Cmd = "code-insiders"; Scheme = "vscode-insiders" },
    @{ Name = "VSCodium"; Cmd = "codium"; Scheme = "vscodium" },
    @{ Name = "Cursor"; Cmd = "cursor"; Scheme = "cursor" },
    @{ Name = "Antigravity"; Cmd = "agy-ide"; Scheme = "agy" }
)

$availableEditors = @($editorsToCheck | Where-Object { Get-Command $_.Cmd -ErrorAction SilentlyContinue })

if ($availableEditors.Count -eq 0) {
    Fail $msg_no_editors
}

$idx = [Array]::IndexOf(@($availableEditors.Scheme), $targetScheme)

if ($targetScheme -and $idx -ge 0) {
    $selectedIndex = $idx
} else {
    Write-Host "`n$msg_hint" -ForegroundColor Yellow
    Write-Host "$msg_hint2" -ForegroundColor Yellow

    Write-Host ""
    for ($i = 0; $i -lt $availableEditors.Count; $i++) {
        Write-Host "$($i + 1)) $($availableEditors[$i].Name)"
    }
    if ($availableEditors.Count -gt 1) {
        Write-Host "a) $msg_all_editors"
    }
    Write-Host "q) $msg_quit`n"

    $choice = Read-Host $msg_select_install

    if ($choice -eq 'q') {
        Write-Host $msg_cancelled
        Pause
        exit 0
    } elseif ($choice -eq 'a') {
        if ($availableEditors.Count -le 1) {
            Fail $msg_invalid
        }
        $installAll = $true
    } else {
        if ($choice -notmatch '^[0-9]+$' -or [int]$choice -lt 1 -or [int]$choice -gt $availableEditors.Count) {
            Fail $msg_invalid
        }
        $selectedIndex = [int]$choice - 1
    }
}

function Invoke-Step {
    param([string]$Message, [scriptblock]$Action, [string]$ErrorMsg)
    Write-Host -NoNewline "  $Message"
    
    $prevPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $ok = $true
    try {
        & $Action
        if (-not $?) { $ok = $false }
    } catch {
        $ok = $false
    } finally {
        $ErrorActionPreference = $prevPreference
    }
    
    if ($ok) { Write-Host "`r$([char]0x2714)" -ForegroundColor Green }
    else     { Write-Host "`r$([char]0x2718)" -ForegroundColor Red }
    if (!$ok -and $ErrorMsg) { Fail $ErrorMsg }
    return $ok
}

Write-Host ""

$originalLocation = Get-Location

$cwcDir = Join-Path $env:USERPROFILE ".cwc"

try {

if (!(Test-Path $cwcDir)) {
    New-Item -ItemType Directory -Path $cwcDir | Out-Null
}

$indices = if ($installAll) { 0..($availableEditors.Count - 1) } else { $selectedIndex }
foreach ($i in $indices) {
    $editor = $availableEditors[$i]
    $repoDir = Join-Path $cwcDir "repository-$($editor.Scheme)"

    if ($installAll) {
        Write-Host "`n=== $($editor.Name) ===" -ForegroundColor Cyan
    }

    $updated = $false
    if (Test-Path (Join-Path $repoDir ".git")) {
        $updated = Invoke-Step "$msg_step_cloning..." {
            git -C $repoDir fetch origin --quiet *>$null
            if ($LASTEXITCODE -ne 0) { throw "Failed to fetch" }
            if ($commitSha) {
                git -C $repoDir checkout $commitSha --quiet *>$null
                if ($LASTEXITCODE -ne 0) { throw "Failed to checkout" }
            } else {
                git -C $repoDir reset --hard origin/main --quiet *>$null
                if ($LASTEXITCODE -ne 0) { throw "Failed to reset" }
            }
            git -C $repoDir clean -fd --quiet *>$null
            if ($LASTEXITCODE -ne 0) { throw "Failed to clean" }
        } $msg_step_cloning
    }

    if (-not $updated) {
        if (Test-Path $repoDir) {
            Remove-Item -Path $repoDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        $null = Invoke-Step "$msg_step_cloning..." {
            git clone -c core.longpaths=true --quiet https://github.com/CodeWebChat/CWC.git $repoDir *>$null
            if ($LASTEXITCODE -ne 0) { throw "Failed to clone" }
            if ($commitSha) {
                git -C $repoDir checkout $commitSha --quiet *>$null
                if ($LASTEXITCODE -ne 0) { throw "Failed to checkout" }
            }
        } $msg_step_cloning
    }

    Set-Location $repoDir

    $null = Invoke-Step "$msg_step_deps..." {
        npx.cmd --yes pnpm install *>$null
    } $msg_step_deps

    Set-Location apps/editor

    Remove-Item *.vsix -Force -ErrorAction SilentlyContinue

    $null = Invoke-Step "$msg_step_build..." {
        npx.cmd --yes pnpm run build *>$null
    } $msg_step_build

    $vsixFile = Get-ChildItem *.vsix -ErrorAction SilentlyContinue | Select-Object -First 1

    if (!$vsixFile) {
        Fail $msg_vsix_error
    }

    $ok = Invoke-Step "$msg_step_install $($editor.Name)..." {
        & $editor.Cmd --install-extension $vsixFile.FullName --force *>$null
    }
    
    Write-Host ""
    if ($ok) {
        if ($targetScheme) {
            Write-Host $msg_updated
        } else {
            Write-Host "$msg_success $($editor.Name)!"
        }
    } else {
        Write-Host "$msg_error $msg_install_fail $($editor.Name)." -ForegroundColor Red
    }

    Set-Location $originalLocation
}

} finally {
    Set-Location $originalLocation -ErrorAction SilentlyContinue
}

Pause
