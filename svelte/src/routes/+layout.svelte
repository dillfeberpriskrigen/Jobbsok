<script lang="ts">
import './layout.css';

const { children } = $props();
</script>
<header>
	<center><big>
This is not a test... 

It is a header of a test
	</big></center>

</header>

<footer><center>

The hobbits. In isengard

</center></footer>
{@render children()}
