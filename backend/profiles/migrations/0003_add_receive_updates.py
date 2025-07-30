# Generated manually for adding receive_updates field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0002_pmsintegrationrequirement'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='receive_updates',
            field=models.BooleanField(default=False, help_text='Whether the user wants to receive email updates'),
        ),
    ] 