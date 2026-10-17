# Apna portal browser mein online dekhein

1. Repository ke **Deploy to Render** button par click karein.
2. **GitHub se sign in** karein. Agar GitHub access ka popup aaye to apni E-11 repository ki access approve karein. Password kisi chat mein share na karein.
3. `DEMO_PASSWORD` wale khane mein apna naya password likhein: kam az kam **12 characters**. Isi password se aap portal mein login karenge.
4. Free preview resources ko review karke deployment shuru karein. Agar free plan available na ho ya payment maange, paid option ko bina samjhe approve na karein.
5. Build/deploy complete hone dein. `e11-hostel-portal` service **Live** ho jaye to uska `.onrender.com` link kholein. Pehli build mein kuch minutes lag sakte hain.
6. Portal ke **Login** par click karein: email `owner@e11.demo`, password wohi jo step 3 mein chuna. Student demo ka email `student@e11.demo` hai, isi chosen demo password ke saath.

Yeh online demonstration hai: demo rooms/residents ke saath portal dekhein aur workflows try karein. Apni asli students ki information ya real financial records abhi is demo mein na daalein. Saari master-specification features complete nahi hui hain; exact list `IMPLEMENTATION_STATUS.md` mein hai.

The deployment uses one non-root container for Next.js and FastAPI, plus managed PostgreSQL. It automatically migrates and seeds only when explicitly configured as development. The generated encryption secret is stored in the hosting configuration; the chosen password is entered in Render rather than committed to GitHub. The public hostname sets the exact accepted browser origin. HTTPS-only cookies are enabled.

Free hosting policies can change, and free databases may expire or be removed by the provider. Free web services may sleep while idle. Private uploads use temporary container storage in this preview and are not reliable across restarts; durable object storage remains part of the production backlog. A permanent production deployment needs completed billing/recovery controls, approved policies, durable storage/backups and production review.

This repository supplies the tested deployment configuration and button. It cannot create your hosting account, complete your provider sign-in, or claim a public URL exists before Render actually deploys your service.
