# LocalStorage Temizleme Talimatları

Eğer yeni kolonlar hala görünmüyorsa, tarayıcı console'unda şu komutu çalıştırın:

```javascript
localStorage.removeItem('stocks-inventory-table-settings-v1')
location.reload()
```

VEYA

Tarayıcı geliştirici araçlarında (F12):
1. Application tab'ına git
2. Local Storage'ı aç
3. `stocks-inventory-table-settings-v1` anahtarını sil
4. Sayfayı yenile (F5)

Bu, eski kolon ayarlarını temizleyecek ve yeni ayarlarınız devreye girecektir.
