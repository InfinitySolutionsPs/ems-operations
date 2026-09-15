# نشر نظام EMS على Coolify

## الطريقة الجاهزة: Docker Compose

هذه النسخة تحتوي التطبيق وPostgreSQL معًا. في Coolify اختاري **New Resource → Docker Compose** ثم اربطي مستودع GitHub. سيقرأ Coolify ملف `docker-compose.yml` تلقائيًا.

أضيفي متغيرات قاعدة البيانات التالية قبل النشر:

```env
POSTGRES_DB=ems
POSTGRES_USER=ems
POSTGRES_PASSWORD=<كلمة مرور قوية لقاعدة البيانات>
```

بعدها اضغطي **Deploy**. ينشئ النظام تلقائيًا قاعدة PostgreSQL والجداول وحجمي تخزين دائمين: واحد لقاعدة البيانات وآخر لمرفقات الصيانة.

## الطريقة المنفصلة: إنشاء PostgreSQL

من المشروع نفسه في Coolify اختاري **New Resource → Database → PostgreSQL** ثم أنشئي قاعدة البيانات. بعد تشغيلها انسخي **Internal Database URL**.

## 2. إعداد التطبيق

في مورد التطبيق:

- Repository: `InfinitySolutionsPs/ems-operations`
- Branch: `main`
- Build Pack: `Dockerfile`
- Dockerfile Location: `/Dockerfile`
- Port: `3000`
- Health Check Path: `/api/health`

## 3. متغيرات البيئة

أضيفي في **Environment Variables**:

```env
DATABASE_URL=<Internal Database URL من PostgreSQL>
UPLOAD_DIR=/app/data/uploads
```

لا تضعي عنوان PostgreSQL العام إن كان التطبيق وقاعدة البيانات داخل المشروع والشبكة نفسيهما.

## 4. التخزين الدائم للمرفقات

من **Persistent Storage** أضيفي Volume:

- Destination Path: `/app/data`
- الاسم المقترح: `ems-data`

بدون هذا الـ Volume ستُحذف مرفقات طلبات الصيانة عند إعادة بناء الحاوية.

## 5. الدومين

أضيفي الدومين `ems.operations.infinite.ps` على المنفذ `3000`. يجب أن يشير سجل DNS إلى عنوان الـ VPS، أو يضاف داخليًا في ملف hosts إذا كان النظام داخليًا فقط.

## 6. النشر والفحص

اختاري **Deploy**. بعد الانتهاء يجب أن يرجع المسار التالي نتيجة `{"ok":true}`:

```text
https://ems.operations.infinite.ps/api/health
```

يفتح النظام مؤقتًا دون شاشة دخول إلى حين اعتماد نظام المستخدمين والصلاحيات. ينشئ النظام الجداول وحساب المدير المحلي تلقائيًا عند أول اتصال ناجح بقاعدة البيانات.
