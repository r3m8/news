---
layout: default
title: Summaries
---

# Summaries

{% for file in site.static_files %}
  {% if file.path contains 'summaries/' and file.extname == '.md' %}
    - [{{ file.name | replace: '.md', '' }}]({{ file.path | replace: '.md', '.html' }})
  {% endif %}
{% endfor %}
