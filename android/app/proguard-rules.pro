# kotlinx.serialization: mantém os serializers gerados das classes do contrato.
-keepattributes *Annotation*, InnerClasses
-keep,includedescriptorclasses class br.com.economae.**$$serializer { *; }
-keepclassmembers class br.com.economae.** { *** Companion; }
-keepclasseswithmembers class br.com.economae.** { kotlinx.serialization.KSerializer serializer(...); }
