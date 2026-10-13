# 새 버전 배포와 앱 안 업데이트

이 저장소(photo-pick-pp1)는 기존 Photo Pick과 나란히 설치되는 PP-1 버전이다. 앱 ID `com.photopick.pp1`, 이름 「Photo Pick PP-1」.

설치된 앱은 메뉴 > 앱 업데이트 확인에서 깃허브 릴리스를 찾아 바로 내려받고 설치한다 (`AppUpdater.java`).
앱이 찾는 규칙은 아래 두 가지뿐이다.

· 릴리스 태그: `android-vX.Y.Z`
· 첨부 파일 이름: `PhotoPick-X.Y.Z-debug.apk`, 기존 앱과 같은 서명 키

## 새 버전 올리는 순서
1. `app/build.gradle`에서 `versionCode`를 1 올리고 `versionName`을 새 버전으로 바꾼다.
2. 커밋하고 main에 올린다.
3. 같은 버전 태그를 올린다: `git tag android-v0.3.1 && git push origin android-v0.3.1`
4. Actions의 Release Android APK가 APK를 빌드해서 같은 이름의 릴리스에 붙인다 (약 5분).
5. 휴대폰 앱에서 메뉴 > 앱 업데이트 확인 → 업데이트.

태그를 쓰지 않고 Actions 화면에서 Release Android APK > Run workflow에 태그를 입력해도 된다.

## 서명 키 (한 번만 설정)
업데이트는 기존 앱과 같은 서명 키로 만든 APK만 설치된다. 지금 키는 개발 PC의 `~/.android/debug.keystore` (SHA-256 `1D:2B:45:23:...:2F:67:FB:31`).
저장소 Settings > Secrets and variables > Actions > New repository secret
· 이름: `ANDROID_DEBUG_KEYSTORE_B64`
· 값: debug.keystore 파일을 base64로 바꾼 한 줄
키를 바꾸면 이미 설치된 앱은 한 번 지우고 다시 설치해야 한다.
